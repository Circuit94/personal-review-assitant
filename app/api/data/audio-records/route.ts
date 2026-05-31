import { NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import supabaseAdmin from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

export async function GET(req: Request) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { data: records, error } = await supabaseAdmin
    .from('interview_audio_records')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Supabase jsonb 字段自动反序列化
  return NextResponse.json(records)
}

export async function POST(req: Request) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { file_url, file_name } = await req.json()
  if (!file_url) return NextResponse.json({ error: '缺少 file_url' }, { status: 400 })

  const id = uuidv4()

  const { data: record, error } = await supabaseAdmin
    .from('interview_audio_records')
    .insert({
      id,
      user_id: user.id,
      file_url,
      file_name: file_name || 'audio',
      status: 'pending',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(record)
}

export async function PUT(req: Request) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { id, status, transcription, qa_segments, analysis } = await req.json()
  if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 })

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (status !== undefined) updates.status = status
  if (transcription !== undefined) updates.transcription = transcription
  if (qa_segments !== undefined) updates.qa_segments = qa_segments
  if (analysis !== undefined) updates.analysis = analysis

  const { data: updated, error } = await supabaseAdmin
    .from('interview_audio_records')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!updated) return NextResponse.json({ error: '记录不存在' }, { status: 404 })
  return NextResponse.json(updated)
}
