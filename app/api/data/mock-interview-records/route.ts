import { NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import supabaseAdmin from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

export async function GET(req: Request) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  // 获取单条记录
  if (id) {
    const { data: record, error } = await supabaseAdmin
      .from('mock_interview_records')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(record)
  }

  // 获取列表（不含完整 messages，减少传输量）
  const { data: records, error } = await supabaseAdmin
    .from('mock_interview_records')
    .select('id, user_id, position, settings, overall_score, overall_feedback, dimensions, duration, question_count, created_at, updated_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(records)
}

export async function POST(req: Request) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const body = await req.json()
  const { position, settings, messages, overall_score, overall_feedback, dimensions, duration, question_count } = body

  if (!position || !messages) {
    return NextResponse.json({ error: '缺少必要字段' }, { status: 400 })
  }

  const id = uuidv4()

  const { data: record, error } = await supabaseAdmin
    .from('mock_interview_records')
    .insert({
      id,
      user_id: user.id,
      position,
      settings: settings || {},
      messages: messages || [],
      overall_score: overall_score || 0,
      overall_feedback: overall_feedback || '',
      dimensions: dimensions || [],
      duration: duration || 0,
      question_count: question_count || 0,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(record)
}

export async function DELETE(req: Request) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('mock_interview_records')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
