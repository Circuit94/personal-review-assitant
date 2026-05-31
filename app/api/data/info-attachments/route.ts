import { NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import supabaseAdmin from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

export async function POST(req: Request) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { module_id, file_name, file_url, file_size } = await req.json()
  if (!module_id || !file_name || !file_url) {
    return NextResponse.json({ error: '缺少必要字段' }, { status: 400 })
  }

  // 验证模块属于当前用户
  const { data: module } = await supabaseAdmin
    .from('info_modules')
    .select('id')
    .eq('id', module_id)
    .eq('user_id', user.id)
    .single()

  if (!module) return NextResponse.json({ error: '模块不存在' }, { status: 404 })

  const id = uuidv4()

  const { data: attachment, error } = await supabaseAdmin
    .from('info_attachments')
    .insert({ id, module_id, user_id: user.id, file_name, file_url, file_size: file_size || 0 })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(attachment)
}

export async function DELETE(req: Request) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 })

  await supabaseAdmin
    .from('info_attachments')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  return NextResponse.json({ success: true })
}
