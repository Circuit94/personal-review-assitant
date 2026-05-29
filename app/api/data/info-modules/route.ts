import { NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import db from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

// 默认模板（首次使用时自动创建）
const DEFAULT_MODULES = [
  {
    name: '基本信息',
    icon: '👤',
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
    icon: '🎓',
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
    icon: '💼',
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
    icon: '🏆',
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
    icon: '🎯',
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
    icon: '📜',
    fields: [
      { label: '证书/技能名称', value: '' },
      { label: '等级', value: '' },
      { label: '获取时间', value: '' },
      { label: '证书编号', value: '' },
    ],
  },
  {
    name: '项目经历',
    icon: '🚀',
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

function initDefaultModules(userId: string) {
  const insertModule = db.prepare(
    'INSERT INTO info_modules (id, user_id, name, icon, sort_order) VALUES (?, ?, ?, ?, ?)'
  )
  const insertField = db.prepare(
    'INSERT INTO info_fields (id, module_id, user_id, label, value, sort_order) VALUES (?, ?, ?, ?, ?, ?)'
  )

  const transaction = db.transaction(() => {
    DEFAULT_MODULES.forEach((mod, modIdx) => {
      const moduleId = uuidv4()
      insertModule.run(moduleId, userId, mod.name, mod.icon, modIdx)
      mod.fields.forEach((field, fieldIdx) => {
        insertField.run(uuidv4(), moduleId, userId, field.label, field.value, fieldIdx)
      })
    })
  })

  transaction()
}

export async function GET(req: Request) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  // 检查是否有模块，没有则初始化默认模板
  const count = db.prepare('SELECT COUNT(*) as count FROM info_modules WHERE user_id = ?').get(user.id) as { count: number }
  if (count.count === 0) {
    initDefaultModules(user.id)
  }

  // 获取所有模块及其字段和附件
  const modules = db
    .prepare('SELECT * FROM info_modules WHERE user_id = ? ORDER BY sort_order ASC, created_at ASC')
    .all(user.id) as { id: string; name: string; icon: string; sort_order: number }[]

  const result = modules.map((mod) => {
    const fields = db
      .prepare('SELECT * FROM info_fields WHERE module_id = ? ORDER BY sort_order ASC, created_at ASC')
      .all(mod.id)
    const attachments = db
      .prepare('SELECT * FROM info_attachments WHERE module_id = ? ORDER BY created_at DESC')
      .all(mod.id)
    return { ...mod, fields, attachments }
  })

  return NextResponse.json(result)
}

export async function POST(req: Request) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { name, icon, fields } = await req.json()
  if (!name) return NextResponse.json({ error: '模块名称不能为空' }, { status: 400 })

  const moduleId = uuidv4()
  const maxOrder = db.prepare('SELECT MAX(sort_order) as max FROM info_modules WHERE user_id = ?').get(user.id) as { max: number | null }
  const sortOrder = (maxOrder.max || 0) + 1

  db.prepare('INSERT INTO info_modules (id, user_id, name, icon, sort_order) VALUES (?, ?, ?, ?, ?)').run(
    moduleId, user.id, name, icon || '📋', sortOrder
  )

  // 如果提供了字段，批量创建
  if (Array.isArray(fields) && fields.length > 0) {
    const insertField = db.prepare(
      'INSERT INTO info_fields (id, module_id, user_id, label, value, sort_order) VALUES (?, ?, ?, ?, ?, ?)'
    )
    const transaction = db.transaction(() => {
      fields.forEach((f: { label: string; value?: string }, idx: number) => {
        insertField.run(uuidv4(), moduleId, user.id, f.label, f.value || '', idx)
      })
    })
    transaction()
  }

  // 返回完整模块
  const module = db.prepare('SELECT * FROM info_modules WHERE id = ?').get(moduleId) as Record<string, unknown>
  const moduleFields = db.prepare('SELECT * FROM info_fields WHERE module_id = ? ORDER BY sort_order ASC').all(moduleId)
  return NextResponse.json({ ...module, fields: moduleFields, attachments: [] })
}

export async function PUT(req: Request) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { id, name, icon } = await req.json()
  if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 })

  const existing = db.prepare('SELECT id FROM info_modules WHERE id = ? AND user_id = ?').get(id, user.id)
  if (!existing) return NextResponse.json({ error: '模块不存在' }, { status: 404 })

  const updates: string[] = []
  const values: string[] = []
  if (name !== undefined) { updates.push('name = ?'); values.push(name) }
  if (icon !== undefined) { updates.push('icon = ?'); values.push(icon) }
  updates.push("updated_at = datetime('now')")
  values.push(id, user.id)

  db.prepare(`UPDATE info_modules SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`).run(...values)

  return NextResponse.json({ success: true })
}

export async function DELETE(req: Request) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 })

  db.prepare('DELETE FROM info_modules WHERE id = ? AND user_id = ?').run(id, user.id)
  return NextResponse.json({ success: true })
}
