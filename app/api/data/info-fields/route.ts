import { NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import supabaseAdmin from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

export async function POST(req: Request) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { module_id, label, value } = await req.json()
  if (!module_id || !label) return NextResponse.json({ error: '缺少必要字段' }, { status: 400 })

  // 验证模块属于当前用户
  const { data: module } = await supabaseAdmin
    .from('info_modules')
    .select('id')
    .eq('id', module_id)
    .eq('user_id', user.id)
    .single()

  if (!module) return NextResponse.json({ error: '模块不存在' }, { status: 404 })

  // 获取当前最大 sort_order
  const { data: maxOrderRow } = await supabaseAdmin
    .from('info_fields')
    .select('sort_order')
    .eq('module_id', module_id)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single()

  const sortOrder = (maxOrderRow?.sort_order || 0) + 1
  const id = uuidv4()

  const { data: field, error } = await supabaseAdmin
    .from('info_fields')
    .insert({ id, module_id, user_id: user.id, label, value: value || '', sort_order: sortOrder })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(field)
}

export async function PUT(req: Request) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { id, label, value } = await req.json()
  if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 })

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (label !== undefined) updates.label = label
  if (value !== undefined) updates.value = value

  const { data: updated, error } = await supabaseAdmin
    .from('info_fields')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!updated) return NextResponse.json({ error: '字段不存在' }, { status: 404 })
  return NextResponse.json(updated)
}

export async function DELETE(req: Request) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 })

  await supabaseAdmin
    .from('info_fields')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  return NextResponse.json({ success: true })
}
