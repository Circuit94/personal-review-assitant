import { NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import db from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

export async function GET(req: Request) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const sessionType = searchParams.get('type') || 'chat'

  const sessions = db
    .prepare('SELECT * FROM chat_sessions WHERE user_id = ? AND session_type = ? ORDER BY created_at DESC')
    .all(user.id, sessionType)
  return NextResponse.json(sessions)
}

export async function POST(req: Request) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { session_type, title, position } = await req.json()
  const id = uuidv4()

  db.prepare('INSERT INTO chat_sessions (id, user_id, session_type, title, position) VALUES (?, ?, ?, ?, ?)').run(
    id,
    user.id,
    session_type || 'chat',
    title || '新对话',
    position || null
  )

  const session = db.prepare('SELECT * FROM chat_sessions WHERE id = ?').get(id)
  return NextResponse.json(session)
}

export async function DELETE(req: Request) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 })

  db.prepare('DELETE FROM chat_sessions WHERE id = ? AND user_id = ?').run(id, user.id)
  return NextResponse.json({ success: true })
}
