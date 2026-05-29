import { NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import db from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

export async function POST(req: Request) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { module_id, label, value } = await req.json()
  if (!module_id || !label) return NextResponse.json({ error: '缺少必要字段' }, { status: 400 })

  // 验证模块属于当前用户
  const module = db.prepare('SELECT id FROM info_modules WHERE id = ? AND user_id = ?').get(module_id, user.id)
  if (!module) return NextResponse.json({ error: '模块不存在' }, { status: 404 })

  const maxOrder = db.prepare('SELECT MAX(sort_order) as max FROM info_fields WHERE module_id = ?').get(module_id) as { max: number | null }
  const sortOrder = (maxOrder.max || 0) + 1

  const id = uuidv4()
  db.prepare(
    'INSERT INTO info_fields (id, module_id, user_id, label, value, sort_order) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, module_id, user.id, label, value || '', sortOrder)

  const field = db.prepare('SELECT * FROM info_fields WHERE id = ?').get(id)
  return NextResponse.json(field)
}

export async function PUT(req: Request) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { id, label, value } = await req.json()
  if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 })

  const existing = db.prepare('SELECT id FROM info_fields WHERE id = ? AND user_id = ?').get(id, user.id)
  if (!existing) return NextResponse.json({ error: '字段不存在' }, { status: 404 })

  const updates: string[] = []
  const values: (string | null)[] = []
  if (label !== undefined) { updates.push('label = ?'); values.push(label) }
  if (value !== undefined) { updates.push('value = ?'); values.push(value) }
  updates.push("updated_at = datetime('now')")
  values.push(id, user.id)

  db.prepare(`UPDATE info_fields SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`).run(...values)

  const updated = db.prepare('SELECT * FROM info_fields WHERE id = ?').get(id)
  return NextResponse.json(updated)
}

export async function DELETE(req: Request) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 })

  db.prepare('DELETE FROM info_fields WHERE id = ? AND user_id = ?').run(id, user.id)
  return NextResponse.json({ success: true })
}
