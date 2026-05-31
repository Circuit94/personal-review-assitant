import { NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import supabaseAdmin from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

export async function GET(req: Request) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const sessionId = searchParams.get('session_id')
  if (!sessionId) return NextResponse.json({ error: '缺少 session_id' }, { status: 400 })

  // 验证 session 属于当前用户
  const { data: session } = await supabaseAdmin
    .from('chat_sessions')
    .select('id')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .single()

  if (!session) return NextResponse.json({ error: '会话不存在' }, { status: 404 })

  const { data: questions, error } = await supabaseAdmin
    .from('mock_interview_questions')
    .select('*')
    .eq('session_id', sessionId)
    .order('question_number', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(questions)
}

export async function POST(req: Request) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { session_id, questions } = await req.json()
  if (!session_id || !Array.isArray(questions)) {
    return NextResponse.json({ error: '缺少必要字段' }, { status: 400 })
  }

  // 验证 session 属于当前用户
  const { data: session } = await supabaseAdmin
    .from('chat_sessions')
    .select('id')
    .eq('id', session_id)
    .eq('user_id', user.id)
    .single()

  if (!session) return NextResponse.json({ error: '会话不存在' }, { status: 404 })

  // 批量插入
  const rows = questions.map((item: { question: string; question_number: number }) => ({
    id: uuidv4(),
    session_id,
    question_number: item.question_number,
    question: item.question,
  }))

  const { error: insertError } = await supabaseAdmin
    .from('mock_interview_questions')
    .insert(rows)

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

  // 返回插入后的数据
  const { data: saved, error } = await supabaseAdmin
    .from('mock_interview_questions')
    .select('*')
    .eq('session_id', session_id)
    .order('question_number', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(saved)
}

export async function PUT(req: Request) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { id, user_answer, ai_feedback } = await req.json()
  if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 })

  // 通过 session 验证所有权
  const { data: question } = await supabaseAdmin
    .from('mock_interview_questions')
    .select('id, session_id')
    .eq('id', id)
    .single()

  if (!question) return NextResponse.json({ error: '记录不存在' }, { status: 404 })

  const { data: session } = await supabaseAdmin
    .from('chat_sessions')
    .select('id')
    .eq('id', question.session_id)
    .eq('user_id', user.id)
    .single()

  if (!session) return NextResponse.json({ error: '记录不存在' }, { status: 404 })

  const updates: Record<string, unknown> = {}
  if (user_answer !== undefined) updates.user_answer = user_answer
  if (ai_feedback !== undefined) updates.ai_feedback = ai_feedback

  if (Object.keys(updates).length === 0) {
    const { data } = await supabaseAdmin.from('mock_interview_questions').select('*').eq('id', id).single()
    return NextResponse.json(data)
  }

  const { data: updated, error } = await supabaseAdmin
    .from('mock_interview_questions')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(updated)
}
