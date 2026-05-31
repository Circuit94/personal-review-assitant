import { NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import supabaseAdmin from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

export async function POST(req: Request) {
  try {
    const user = getUserFromRequest(req)
    if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

    // 速率限制
    const { allowed } = checkRateLimit(`audio-upload:${user.id}`, { maxRequests: 5, windowMs: 300000 })
    if (!allowed) {
      return NextResponse.json({ error: '上传过于频繁，请 5 分钟后重试' }, { status: 429 })
    }

    const { fileUrl, fileName } = await req.json()

    if (!fileUrl) {
      return NextResponse.json({ error: '缺少文件 URL' }, { status: 400 })
    }

    // 插入数据库记录
    const id = uuidv4()
    const { error } = await supabaseAdmin
      .from('interview_audio_records')
      .insert({ id, user_id: user.id, file_url: fileUrl, file_name: fileName || 'audio', status: 'pending' })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true, recordId: id })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '上传失败'
    console.error('Upload error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
