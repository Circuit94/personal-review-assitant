import { NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { put } from '@vercel/blob'
import { v4 as uuidv4 } from 'uuid'

export async function POST(req: Request) {
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
  const pathname = `uploads/${type}/${fileName}`

  // 上传到 Vercel Blob
  const blob = await put(pathname, file, {
    access: 'public',
  })

  return NextResponse.json({
    url: blob.url,
    fileName: file.name,
    size: file.size,
  })
}
