import { NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import supabaseAdmin from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

export async function GET(req: Request) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { data: records, error } = await supabaseAdmin
    .from('interview_sprint_records')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    // 表不存在时返回空数组而非报错
    if (error.message.includes('schema cache') || error.code === '42P01') {
      return NextResponse.json([])
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(records)
}

export async function POST(req: Request) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { company, position, sprint_data } = await req.json()
  if (!sprint_data) return NextResponse.json({ error: '缺少 sprint_data' }, { status: 400 })

  const id = uuidv4()

  const { data: record, error } = await supabaseAdmin
    .from('interview_sprint_records')
    .insert({
      id,
      user_id: user.id,
      company: company || '',
      position: position || '',
      sprint_data,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(record)
}

export async function DELETE(req: Request) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('interview_sprint_records')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
