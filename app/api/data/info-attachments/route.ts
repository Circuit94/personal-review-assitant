import { NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import db from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

export async function POST(req: Request) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { module_id, file_name, file_url, file_size } = await req.json()
  if (!module_id || !file_name || !file_url) {
    return NextResponse.json({ error: '缺少必要字段' }, { status: 400 })
  }

  // 验证模块属于当前用户
  const module = db.prepare('SELECT id FROM info_modules WHERE id = ? AND user_id = ?').get(module_id, user.id)
  if (!module) return NextResponse.json({ error: '模块不存在' }, { status: 404 })

  const id = uuidv4()
  db.prepare(
    'INSERT INTO info_attachments (id, module_id, user_id, file_name, file_url, file_size) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, module_id, user.id, file_name, file_url, file_size || 0)

  const attachment = db.prepare('SELECT * FROM info_attachments WHERE id = ?').get(id)
  return NextResponse.json(attachment)
}

export async function DELETE(req: Request) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 })

  db.prepare('DELETE FROM info_attachments WHERE id = ? AND user_id = ?').run(id, user.id)
  return NextResponse.json({ success: true })
}
