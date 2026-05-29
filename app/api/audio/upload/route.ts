import { NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { supabaseAdmin } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'

export async function POST(req: Request) {
  try {
    // 速率限制
    const ip = req.headers.get('x-forwarded-for') || 'unknown'
    const { allowed } = checkRateLimit(`audio-upload:${ip}`, { maxRequests: 5, windowMs: 300000 })
    if (!allowed) {
      return NextResponse.json({ error: '上传过于频繁，请 5 分钟后重试' }, { status: 429 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const userId = formData.get('userId') as string | null
    const title = formData.get('title') as string | null

    if (!file || !userId) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 })
    }

    // 校验文件格式
    const validFormats = ['audio/mpeg', 'audio/wav', 'audio/x-m4a', 'audio/mp4']
    if (!validFormats.some((f) => file.type.includes(f.split('/')[1]))) {
      return NextResponse.json({ error: '仅支持 MP3, WAV, M4A 格式' }, { status: 400 })
    }

    // 校验文件大小（50MB）
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: '文件不能超过 50MB' }, { status: 400 })
    }

    // 上传到 Vercel Blob
    const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()
    const blob = await put(`audio/${userId}/${Date.now()}${fileExt}`, file, {
      access: 'public',
    })

    // 插入数据库记录
    const { data: record, error: dbError } = await supabaseAdmin
      .from('interview_audio_records')
      .insert({
        user_id: userId,
        title: title || file.name.split('.')[0],
        file_url: blob.url,
        file_format: fileExt.replace('.', ''),
        file_size: file.size,
        status: 'pending',
      })
      .select()
      .single()

    if (dbError) throw dbError

    // 触发异步处理（Fire-and-forget，但记录了 recordId）
    // 注意：生产环境应使用消息队列（如 Inngest/QStash）确保可靠执行
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.headers.get('origin') || 'http://localhost:3000'
    fetch(`${baseUrl}/api/audio/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recordId: record.id, userId }),
    }).catch((err) => console.error('Failed to trigger processing:', err))

    return NextResponse.json({ success: true, recordId: record.id })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '上传失败'
    console.error('Upload error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
