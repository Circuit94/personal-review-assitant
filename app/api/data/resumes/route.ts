import { NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import db from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

export async function GET(req: Request) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const resumes = db.prepare('SELECT * FROM resumes WHERE user_id = ? ORDER BY created_at DESC').all(user.id)
  return NextResponse.json(resumes)
}

export async function POST(req: Request) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { file_name, file_url, extracted_text } = await req.json()
  const id = uuidv4()

  db.prepare('INSERT INTO resumes (id, user_id, file_name, file_url, extracted_text) VALUES (?, ?, ?, ?, ?)').run(
    id,
    user.id,
    file_name,
    file_url || null,
    extracted_text || null
  )

  const resume = db.prepare('SELECT * FROM resumes WHERE id = ?').get(id)
  return NextResponse.json(resume)
}

export async function PUT(req: Request) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { id, extracted_text, file_name } = await req.json()
  if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 })

  const existing = db.prepare('SELECT id FROM resumes WHERE id = ? AND user_id = ?').get(id, user.id)
  if (!existing) return NextResponse.json({ error: '记录不存在' }, { status: 404 })

  const updates: string[] = []
  const values: (string | null)[] = []

  if (extracted_text !== undefined) {
    updates.push('extracted_text = ?')
    values.push(extracted_text)
  }
  if (file_name !== undefined) {
    updates.push('file_name = ?')
    values.push(file_name)
  }
  updates.push("updated_at = datetime('now')")
  values.push(id, user.id)

  db.prepare(`UPDATE resumes SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`).run(...values)

  const updated = db.prepare('SELECT * FROM resumes WHERE id = ?').get(id)
  return NextResponse.json(updated)
}

export async function DELETE(req: Request) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 })

  db.prepare('DELETE FROM resumes WHERE id = ? AND user_id = ?').run(id, user.id)
  return NextResponse.json({ success: true })
}
