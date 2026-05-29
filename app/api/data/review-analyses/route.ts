import { NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import db from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

export async function GET(req: Request) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const analyses = db
    .prepare('SELECT * FROM review_analyses WHERE user_id = ? ORDER BY created_at DESC')
    .all(user.id)

  // JSON 字段反序列化
  const parsed = (analyses as Record<string, string>[]).map((a) => ({
    ...a,
    strengths: a.strengths ? JSON.parse(a.strengths) : [],
    weaknesses: a.weaknesses ? JSON.parse(a.weaknesses) : [],
    suggestions: a.suggestions ? JSON.parse(a.suggestions) : [],
  }))

  return NextResponse.json(parsed)
}

export async function POST(req: Request) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { analysis_type, period_start, period_end, summary, strengths, weaknesses, suggestions } = await req.json()

  const id = uuidv4()
  db.prepare(
    `INSERT INTO review_analyses (id, user_id, analysis_type, period_start, period_end, summary, strengths, weaknesses, suggestions)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    user.id,
    analysis_type || 'weekly',
    period_start || null,
    period_end || null,
    summary || null,
    strengths ? JSON.stringify(strengths) : null,
    weaknesses ? JSON.stringify(weaknesses) : null,
    suggestions ? JSON.stringify(suggestions) : null
  )

  const record = db.prepare('SELECT * FROM review_analyses WHERE id = ?').get(id) as Record<string, string>
  return NextResponse.json({
    ...record,
    strengths: record.strengths ? JSON.parse(record.strengths) : [],
    weaknesses: record.weaknesses ? JSON.parse(record.weaknesses) : [],
    suggestions: record.suggestions ? JSON.parse(record.suggestions) : [],
  })
}
