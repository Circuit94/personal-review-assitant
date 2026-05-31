import { NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import supabaseAdmin from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

export async function GET(req: Request) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { data: records, error } = await supabaseAdmin
    .from('interview_records')
    .select('*')
    .eq('user_id', user.id)
    .order('interview_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(records)
}

export async function POST(req: Request) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { title, company, position, interview_date, content, stage } = await req.json()
  if (!title) return NextResponse.json({ error: 'title 不能为空' }, { status: 400 })

  const id = uuidv4()

  const { data: record, error } = await supabaseAdmin
    .from('interview_records')
    .insert({
      id,
      user_id: user.id,
      title,
      company: company || null,
      position: position || null,
      interview_date: interview_date || null,
      stage: stage || 'applied',
      content: content || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(record)
}

export async function PUT(req: Request) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { id, title, company, position, interview_date, content, stage } = await req.json()
  if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 })

  const updates: Record<string, unknown> = {}
  if (title !== undefined) updates.title = title
  if (company !== undefined) updates.company = company || null
  if (position !== undefined) updates.position = position || null
  if (interview_date !== undefined) updates.interview_date = interview_date || null
  if (content !== undefined) updates.content = content || null
  if (stage !== undefined) updates.stage = stage

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: '没有需要更新的字段' }, { status: 400 })
  }

  const { data: record, error } = await supabaseAdmin
    .from('interview_records')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!record) return NextResponse.json({ error: '记录不存在' }, { status: 404 })
  return NextResponse.json(record)
}

export async function DELETE(req: Request) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 })

  await supabaseAdmin
    .from('interview_records')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  return NextResponse.json({ success: true })
}
