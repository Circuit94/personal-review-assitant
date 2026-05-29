import { NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import db from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

export async function GET(req: Request) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const records = db
    .prepare('SELECT * FROM interview_records WHERE user_id = ? ORDER BY interview_date DESC, created_at DESC')
    .all(user.id)
  return NextResponse.json(records)
}

export async function POST(req: Request) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { title, company, position, interview_date, content, stage } = await req.json()
  if (!title) return NextResponse.json({ error: 'title 不能为空' }, { status: 400 })

  const id = uuidv4()
  db.prepare(
    'INSERT INTO interview_records (id, user_id, title, company, position, interview_date, stage, content) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, user.id, title, company || null, position || null, interview_date || null, stage || 'applied', content || null)

  const record = db.prepare('SELECT * FROM interview_records WHERE id = ?').get(id)
  return NextResponse.json(record)
}

export async function PUT(req: Request) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { id, title, company, position, interview_date, content, stage } = await req.json()
  if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 })

  // 验证记录属于当前用户
  const existing = db.prepare('SELECT id FROM interview_records WHERE id = ? AND user_id = ?').get(id, user.id) as Record<string, unknown> | undefined
  if (!existing) return NextResponse.json({ error: '记录不存在' }, { status: 404 })

  // 动态构建更新语句
  const updates: string[] = []
  const values: unknown[] = []

  if (title !== undefined) { updates.push('title = ?'); values.push(title) }
  if (company !== undefined) { updates.push('company = ?'); values.push(company || null) }
  if (position !== undefined) { updates.push('position = ?'); values.push(position || null) }
  if (interview_date !== undefined) { updates.push('interview_date = ?'); values.push(interview_date || null) }
  if (content !== undefined) { updates.push('content = ?'); values.push(content || null) }
  if (stage !== undefined) { updates.push('stage = ?'); values.push(stage) }

  if (updates.length === 0) {
    return NextResponse.json({ error: '没有需要更新的字段' }, { status: 400 })
  }

  values.push(id, user.id)
  db.prepare(`UPDATE interview_records SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`).run(...values)

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
