import { NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import db from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

export async function GET(req: Request) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const records = db
    .prepare('SELECT * FROM interview_records WHERE user_id = ? ORDER BY created_at DESC')
    .all(user.id)
  return NextResponse.json(records)
}

export async function POST(req: Request) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { title, company, position, interview_date, content } = await req.json()
  if (!title) return NextResponse.json({ error: 'title 不能为空' }, { status: 400 })

  const id = uuidv4()
  db.prepare(
    'INSERT INTO interview_records (id, user_id, title, company, position, interview_date, content) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(id, user.id, title, company || null, position || null, interview_date || null, content || null)

  const record = db.prepare('SELECT * FROM interview_records WHERE id = ?').get(id)
  return NextResponse.json(record)
}

export async function DELETE(req: Request) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 })

  db.prepare('DELETE FROM interview_records WHERE id = ? AND user_id = ?').run(id, user.id)
  return NextResponse.json({ success: true })
}
