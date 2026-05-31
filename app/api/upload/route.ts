import { NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import supabaseAdmin from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

export async function POST(req: Request) {
  try {
    const user = getUserFromRequest(req)
    if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const type = (formData.get('type') as string) || 'resumes' // resumes | audio

    if (!file) {
      return NextResponse.json({ error: '未选择文件' }, { status: 400 })
    }

    // 限制文件大小（简历 10MB，音频 50MB）
    const maxSize = type === 'audio' ? 50 * 1024 * 1024 : 10 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json({ error: `文件过大，最大 ${maxSize / 1024 / 1024}MB` }, { status: 400 })
    }

    // 生成唯一文件名
    const ext = file.name.includes('.') ? '.' + file.name.split('.').pop() : ''
    const fileName = `${uuidv4()}${ext}`
    const filePath = `${type}/${user.id}/${fileName}`

    // 上传到 Supabase Storage
    const buffer = Buffer.from(await file.arrayBuffer())
    const { data, error } = await supabaseAdmin.storage
      .from('uploads')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (error) {
      console.error('Upload error:', error)
      return NextResponse.json({ error: '文件上传失败: ' + error.message }, { status: 500 })
    }

    // 获取公开 URL
    const { data: urlData } = supabaseAdmin.storage
      .from('uploads')
      .getPublicUrl(data.path)

    return NextResponse.json({
      url: urlData.publicUrl,
      fileName: file.name,
      size: file.size,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '上传失败'
    console.error('Upload error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
