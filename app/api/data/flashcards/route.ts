import { NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import supabaseAdmin from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

export async function GET(req: Request) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const tag = searchParams.get('tag')
  const due = searchParams.get('due') // 'true' = 只返回到期需要复习的卡片

  let query = supabaseAdmin
    .from('flashcards')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (tag) {
    query = query.contains('tags', [tag])
  }

  if (due === 'true') {
    query = query.lte('next_review_at', new Date().toISOString())
  }

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { question, answer, tags, jd_reference } = await req.json()

  if (!question?.trim()) {
    return NextResponse.json({ error: '问题不能为空' }, { status: 400 })
  }

  const id = uuidv4()
  const now = new Date().toISOString()

  const { data, error } = await supabaseAdmin
    .from('flashcards')
    .insert({
      id,
      user_id: user.id,
      question: question.trim(),
      answer: answer?.trim() || '',
      tags: tags || [],
      jd_reference: jd_reference || null,
      ease_factor: 2.5,
      interval: 0,
      repetitions: 0,
      next_review_at: now,
      review_count: 0,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PUT(req: Request) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { id, question, answer, optimized_answer, tags, jd_reference } = await req.json()

  if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 })

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (question !== undefined) updateData.question = question.trim()
  if (answer !== undefined) updateData.answer = answer.trim()
  if (optimized_answer !== undefined) updateData.optimized_answer = optimized_answer
  if (tags !== undefined) updateData.tags = tags
  if (jd_reference !== undefined) updateData.jd_reference = jd_reference

  const { data, error } = await supabaseAdmin
    .from('flashcards')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: Request) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('flashcards')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
