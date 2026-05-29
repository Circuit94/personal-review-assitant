import { NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import db from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

export async function GET(req: Request) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const sessionId = searchParams.get('session_id')
  if (!sessionId) return NextResponse.json({ error: '缺少 session_id' }, { status: 400 })

  // 验证 session 属于当前用户
  const session = db.prepare('SELECT id FROM chat_sessions WHERE id = ? AND user_id = ?').get(sessionId, user.id)
  if (!session) return NextResponse.json({ error: '会话不存在' }, { status: 404 })

  const questions = db
    .prepare('SELECT * FROM mock_interview_questions WHERE session_id = ? ORDER BY question_number ASC')
    .all(sessionId)
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
  const session = db.prepare('SELECT id FROM chat_sessions WHERE id = ? AND user_id = ?').get(session_id, user.id)
  if (!session) return NextResponse.json({ error: '会话不存在' }, { status: 404 })

  const insert = db.prepare(
    'INSERT INTO mock_interview_questions (id, session_id, question_number, question) VALUES (?, ?, ?, ?)'
  )

  const insertMany = db.transaction((items: { question: string; question_number: number }[]) => {
    for (const item of items) {
      insert.run(uuidv4(), session_id, item.question_number, item.question)
    }
  })

  insertMany(questions)

  const saved = db
    .prepare('SELECT * FROM mock_interview_questions WHERE session_id = ? ORDER BY question_number ASC')
    .all(session_id)
  return NextResponse.json(saved)
}

export async function PUT(req: Request) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { id, user_answer, ai_feedback } = await req.json()
  if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 })

  // 通过 join 验证所有权
  const question = db
    .prepare(
      `SELECT mq.id FROM mock_interview_questions mq
       JOIN chat_sessions cs ON mq.session_id = cs.id
       WHERE mq.id = ? AND cs.user_id = ?`
    )
    .get(id, user.id)
  if (!question) return NextResponse.json({ error: '记录不存在' }, { status: 404 })

  const updates: string[] = []
  const values: (string | null)[] = []

  if (user_answer !== undefined) {
    updates.push('user_answer = ?')
    values.push(user_answer)
  }
  if (ai_feedback !== undefined) {
    updates.push('ai_feedback = ?')
    values.push(ai_feedback)
  }

  if (updates.length > 0) {
    values.push(id)
    db.prepare(`UPDATE mock_interview_questions SET ${updates.join(', ')} WHERE id = ?`).run(...values)
  }

  const updated = db.prepare('SELECT * FROM mock_interview_questions WHERE id = ?').get(id)
  return NextResponse.json(updated)
}
