import { NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import supabaseAdmin from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

const DEFAULT_MODULES = [
  {
    name: '基本信息',
    icon: '\u{1F464}',
    fields: [
      { label: '姓名', value: '' },
      { label: '性别', value: '' },
      { label: '出生日期', value: '' },
      { label: '手机号', value: '' },
      { label: '邮箱', value: '' },
      { label: '现居城市', value: '' },
      { label: '政治面貌', value: '' },
      { label: '身份证号', value: '' },
    ],
  },
  {
    name: '教育背景',
    icon: '\u{1F393}',
    fields: [
      { label: '学校名称', value: '' },
      { label: '学历', value: '' },
      { label: '专业', value: '' },
      { label: '入学时间', value: '' },
      { label: '毕业时间', value: '' },
      { label: 'GPA/排名', value: '' },
      { label: '主修课程', value: '' },
    ],
  },
  {
    name: '实习经历',
    icon: '\u{1F4BC}',
    fields: [
      { label: '公司名称', value: '' },
      { label: '部门', value: '' },
      { label: '岗位', value: '' },
      { label: '开始时间', value: '' },
      { label: '结束时间', value: '' },
      { label: '工作内容', value: '' },
      { label: '主要成果', value: '' },
    ],
  },
  {
    name: '学校荣誉',
    icon: '\u{1F3C6}',
    fields: [
      { label: '荣誉/奖项名称', value: '' },
      { label: '颁发机构', value: '' },
      { label: '获奖时间', value: '' },
      { label: '级别（校级/省级/国家级）', value: '' },
      { label: '说明', value: '' },
    ],
  },
  {
    name: '学生工作',
    icon: '\u{1F3AF}',
    fields: [
      { label: '组织名称', value: '' },
      { label: '职务', value: '' },
      { label: '任职时间', value: '' },
      { label: '工作内容', value: '' },
      { label: '主要成果', value: '' },
    ],
  },
  {
    name: '技能证书',
    icon: '\u{1F4DC}',
    fields: [
      { label: '证书/技能名称', value: '' },
      { label: '等级', value: '' },
      { label: '获取时间', value: '' },
      { label: '证书编号', value: '' },
    ],
  },
  {
    name: '项目经历',
    icon: '\u{1F680}',
    fields: [
      { label: '项目名称', value: '' },
      { label: '角色', value: '' },
      { label: '项目时间', value: '' },
      { label: '技术栈', value: '' },
      { label: '项目描述', value: '' },
      { label: '个人贡献', value: '' },
      { label: '项目成果', value: '' },
    ],
  },
]

async function initDefaultModules(userId: string) {
  for (let modIdx = 0; modIdx < DEFAULT_MODULES.length; modIdx++) {
    const mod = DEFAULT_MODULES[modIdx]
    const moduleId = uuidv4()

    await supabaseAdmin
      .from('info_modules')
      .insert({ id: moduleId, user_id: userId, name: mod.name, icon: mod.icon, sort_order: modIdx })

    const fieldRows = mod.fields.map((field, fieldIdx) => ({
      id: uuidv4(),
      module_id: moduleId,
      user_id: userId,
      label: field.label,
      value: field.value,
      sort_order: fieldIdx,
    }))

    if (fieldRows.length > 0) {
      await supabaseAdmin.from('info_fields').insert(fieldRows)
    }
  }
}

export async function GET(req: Request) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  // 检查是否有模块，没有则初始化默认模板
  const { count } = await supabaseAdmin
    .from('info_modules')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  if (count === 0) {
    await initDefaultModules(user.id)
  }

  // 获取所有模块
  const { data: modules } = await supabaseAdmin
    .from('info_modules')
    .select('*')
    .eq('user_id', user.id)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (!modules) return NextResponse.json([])

  // 获取所有字段和附件
  const moduleIds = modules.map((m) => m.id)

  const { data: allFields } = await supabaseAdmin
    .from('info_fields')
    .select('*')
    .in('module_id', moduleIds)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  const { data: allAttachments } = await supabaseAdmin
    .from('info_attachments')
    .select('*')
    .in('module_id', moduleIds)
    .order('created_at', { ascending: false })

  const result = modules.map((mod) => ({
    ...mod,
    fields: (allFields || []).filter((f) => f.module_id === mod.id),
    attachments: (allAttachments || []).filter((a) => a.module_id === mod.id),
  }))

  return NextResponse.json(result)
}

export async function POST(req: Request) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { name, icon, fields } = await req.json()
  if (!name) return NextResponse.json({ error: '模块名称不能为空' }, { status: 400 })

  const moduleId = uuidv4()

  // 获取当前最大 sort_order
  const { data: maxOrderRow } = await supabaseAdmin
    .from('info_modules')
    .select('sort_order')
    .eq('user_id', user.id)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single()

  const sortOrder = (maxOrderRow?.sort_order || 0) + 1

  await supabaseAdmin
    .from('info_modules')
    .insert({ id: moduleId, user_id: user.id, name, icon: icon || '\u{1F4CB}', sort_order: sortOrder })

  // 如果提供了字段，批量创建
  if (Array.isArray(fields) && fields.length > 0) {
    const fieldRows = fields.map((f: { label: string; value?: string }, idx: number) => ({
      id: uuidv4(),
      module_id: moduleId,
      user_id: user.id,
      label: f.label,
      value: f.value || '',
      sort_order: idx,
    }))
    await supabaseAdmin.from('info_fields').insert(fieldRows)
  }

  // 返回完整模块
  const { data: module } = await supabaseAdmin
    .from('info_modules')
    .select('*')
    .eq('id', moduleId)
    .single()

  const { data: moduleFields } = await supabaseAdmin
    .from('info_fields')
    .select('*')
    .eq('module_id', moduleId)
    .order('sort_order', { ascending: true })

  return NextResponse.json({ ...module, fields: moduleFields || [], attachments: [] })
}

export async function PUT(req: Request) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { id, name, icon } = await req.json()
  if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 })

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (name !== undefined) updates.name = name
  if (icon !== undefined) updates.icon = icon

  const { error } = await supabaseAdmin
    .from('info_modules')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(req: Request) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 })

  await supabaseAdmin
    .from('info_modules')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  return NextResponse.json({ success: true })
}
