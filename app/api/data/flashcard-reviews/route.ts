import { NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import supabaseAdmin from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

/**
 * SM-2 算法实现
 * quality: 0-5 的用户自评
 *   0 = 完全忘记
 *   1 = 错误，但看到答案后想起来了
 *   2 = 错误，但答案感觉很熟悉
 *   3 = 正确，但很费力
 *   4 = 正确，有些犹豫
 *   5 = 完美记忆
 */
function sm2(quality: number, repetitions: number, easeFactor: number, interval: number) {
  let newEF = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  if (newEF < 1.3) newEF = 1.3

  let newInterval: number
  let newRepetitions: number

  if (quality < 3) {
    // 回答不合格，重置
    newRepetitions = 0
    newInterval = 1
  } else {
    newRepetitions = repetitions + 1
    if (newRepetitions === 1) {
      newInterval = 1
    } else if (newRepetitions === 2) {
      newInterval = 6
    } else {
      newInterval = Math.round(interval * newEF)
    }
  }

  return {
    easeFactor: Math.round(newEF * 100) / 100,
    interval: newInterval,
    repetitions: newRepetitions,
  }
}

// POST: 提交一次复习评分
export async function POST(req: Request) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { flashcard_id, quality } = await req.json()

  if (!flashcard_id) return NextResponse.json({ error: '缺少 flashcard_id' }, { status: 400 })
  if (quality === undefined || quality < 0 || quality > 5) {
    return NextResponse.json({ error: 'quality 必须为 0-5' }, { status: 400 })
  }

  // 获取当前卡片状态
  const { data: card, error: fetchError } = await supabaseAdmin
    .from('flashcards')
    .select('*')
    .eq('id', flashcard_id)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !card) {
    return NextResponse.json({ error: '卡片不存在' }, { status: 404 })
  }

  // 计算 SM-2
  const result = sm2(quality, card.repetitions, card.ease_factor, card.interval)

  // 计算下次复习时间
  const nextReview = new Date()
  nextReview.setDate(nextReview.getDate() + result.interval)

  // 记录复习日志
  const logId = uuidv4()
  await supabaseAdmin.from('flashcard_review_logs').insert({
    id: logId,
    flashcard_id,
    user_id: user.id,
    quality,
    ease_factor_before: card.ease_factor,
    ease_factor_after: result.easeFactor,
    interval_before: card.interval,
    interval_after: result.interval,
  })

  // 更新卡片
  const { data: updated, error: updateError } = await supabaseAdmin
    .from('flashcards')
    .update({
      ease_factor: result.easeFactor,
      interval: result.interval,
      repetitions: result.repetitions,
      next_review_at: nextReview.toISOString(),
      review_count: card.review_count + 1,
      last_reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', flashcard_id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  return NextResponse.json({
    card: updated,
    review: {
      quality,
      new_interval: result.interval,
      next_review_at: nextReview.toISOString(),
    },
  })
}

// GET: 获取某张卡片的复习历史（用于记忆曲线）
export async function GET(req: Request) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const flashcardId = searchParams.get('flashcard_id')

  let query = supabaseAdmin
    .from('flashcard_review_logs')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  if (flashcardId) {
    query = query.eq('flashcard_id', flashcardId)
  }

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
