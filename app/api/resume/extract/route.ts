import { NextResponse } from 'next/server'
import { openai, MODEL } from '@/lib/openai'
import { supabaseAdmin } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'

export async function POST(req: Request) {
  try {
    // 速率限制
    const ip = req.headers.get('x-forwarded-for') || 'unknown'
    const { allowed } = checkRateLimit(`resume-extract:${ip}`, { maxRequests: 10, windowMs: 300000 })
    if (!allowed) {
      return NextResponse.json({ error: '请求过于频繁，请稍后重试' }, { status: 429 })
    }

    const { resumeId, fileUrl, fileName } = await req.json()

    if (!resumeId || !fileUrl) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 })
    }

    // 下载文件内容
    const fileRes = await fetch(fileUrl)
    if (!fileRes.ok) throw new Error('无法下载简历文件')

    const fileBuffer = await fileRes.arrayBuffer()
    const fileExt = fileName?.split('.').pop()?.toLowerCase() || ''

    let extractedText = ''

    if (['jpg', 'jpeg', 'png'].includes(fileExt)) {
      // 图片类型：使用 AI 视觉能力提取文本
      const base64 = Buffer.from(fileBuffer).toString('base64')
      const mimeType = fileExt === 'png' ? 'image/png' : 'image/jpeg'

      const response = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: '请提取这份简历图片中的所有文字内容，保持原有的结构和格式。如果有表格，请用文字描述表格内容。',
              },
              {
                type: 'image_url',
                image_url: { url: `data:${mimeType};base64,${base64}` },
              },
            ],
          },
        ],
      })

      extractedText = response.choices[0].message.content || ''
    } else if (['pdf', 'docx', 'doc'].includes(fileExt)) {
      // PDF/DOCX：提示用户手动粘贴（生产环境应使用 pdf-parse / mammoth）
      extractedText = `[文件已上传: ${fileName}] 请在下方文本框中粘贴简历文本内容，以获得更精准的面试题目生成和分析。`
    }

    // 更新数据库
    if (extractedText) {
      await supabaseAdmin
        .from('resumes')
        .update({ extracted_text: extractedText.slice(0, 10000) })
        .eq('id', resumeId)
    }

    return NextResponse.json({ success: true, extractedText: extractedText.slice(0, 500) })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '简历解析失败'
    console.error('Resume extract error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
