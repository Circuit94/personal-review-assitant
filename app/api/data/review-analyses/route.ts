import { NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import supabaseAdmin from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

export async function GET(req: Request) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { data: analyses, error } = await supabaseAdmin
    .from('review_analyses')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Supabase 的 jsonb 字段会自动反序列化，无需手动 JSON.parse
  return NextResponse.json(analyses)
}

export async function POST(req: Request) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { analysis_type, period_start, period_end, summary, strengths, weaknesses, suggestions, metrics } = await req.json()

  const id = uuidv4()

  const { data: record, error } = await supabaseAdmin
    .from('review_analyses')
    .insert({
      id,
      user_id: user.id,
      analysis_type: analysis_type || 'weekly',
      period_start: period_start || null,
      period_end: period_end || null,
      summary: summary || null,
      strengths: strengths || [],
      weaknesses: weaknesses || [],
      suggestions: suggestions || [],
      metrics: metrics || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(record)
}
