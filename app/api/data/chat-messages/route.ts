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

  const messages = db
    .prepare('SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC')
    .all(sessionId)
  return NextResponse.json(messages)
}

export async function POST(req: Request) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { session_id, role, content } = await req.json()
  if (!session_id || !role || !content) {
    return NextResponse.json({ error: '缺少必要字段' }, { status: 400 })
  }

  // 验证 session 属于当前用户
  const session = db.prepare('SELECT id FROM chat_sessions WHERE id = ? AND user_id = ?').get(session_id, user.id)
  if (!session) return NextResponse.json({ error: '会话不存在' }, { status: 404 })

  const id = uuidv4()
  db.prepare('INSERT INTO chat_messages (id, session_id, role, content) VALUES (?, ?, ?, ?)').run(
    id,
    session_id,
    role,
    content
  )

  const message = db.prepare('SELECT * FROM chat_messages WHERE id = ?').get(id)
  return NextResponse.json(message)
}
