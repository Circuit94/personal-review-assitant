import { NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import db from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

export async function GET(req: Request) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const records = db
    .prepare('SELECT * FROM interview_audio_records WHERE user_id = ? ORDER BY created_at DESC')
    .all(user.id)

  // JSON 字段反序列化
  const parsed = (records as Record<string, string>[]).map((r) => ({
    ...r,
    qa_segments: r.qa_segments ? JSON.parse(r.qa_segments) : null,
    analysis: r.analysis ? JSON.parse(r.analysis) : null,
  }))

  return NextResponse.json(parsed)
}

export async function POST(req: Request) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { file_url, file_name } = await req.json()
  if (!file_url) return NextResponse.json({ error: '缺少 file_url' }, { status: 400 })

  const id = uuidv4()
  db.prepare(
    'INSERT INTO interview_audio_records (id, user_id, file_url, file_name, status) VALUES (?, ?, ?, ?, ?)'
  ).run(id, user.id, file_url, file_name || 'audio', 'pending')

  const record = db.prepare('SELECT * FROM interview_audio_records WHERE id = ?').get(id)
  return NextResponse.json(record)
}

export async function PUT(req: Request) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { id, status, transcription, qa_segments, analysis } = await req.json()
  if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 })

  const existing = db
    .prepare('SELECT id FROM interview_audio_records WHERE id = ? AND user_id = ?')
    .get(id, user.id)
  if (!existing) return NextResponse.json({ error: '记录不存在' }, { status: 404 })

  const updates: string[] = []
  const values: (string | null)[] = []

  if (status !== undefined) {
    updates.push('status = ?')
    values.push(status)
  }
  if (transcription !== undefined) {
    updates.push('transcription = ?')
    values.push(transcription)
  }
  if (qa_segments !== undefined) {
    updates.push('qa_segments = ?')
    values.push(JSON.stringify(qa_segments))
  }
  if (analysis !== undefined) {
    updates.push('analysis = ?')
    values.push(JSON.stringify(analysis))
  }
  updates.push("updated_at = datetime('now')")
  values.push(id, user.id)

  db.prepare(
    `UPDATE interview_audio_records SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`
  ).run(...values)

  const updated = db.prepare('SELECT * FROM interview_audio_records WHERE id = ?').get(id) as Record<string, string>
  return NextResponse.json({
    ...updated,
    qa_segments: updated.qa_segments ? JSON.parse(updated.qa_segments) : null,
    analysis: updated.analysis ? JSON.parse(updated.analysis) : null,
  })
}
