import { NextResponse } from 'next/server'
import { openai, MODEL } from '@/lib/openai'
import { checkRateLimit } from '@/lib/rate-limit'
import { validateMessages } from '@/lib/validate'

export async function POST(req: Request) {
  try {
    // 速率限制（基于 IP）
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const { allowed, resetIn } = checkRateLimit(`chat:${ip}`, { maxRequests: 30, windowMs: 60000 })
    if (!allowed) {
      return NextResponse.json(
        { error: `请求过于频繁，请 ${Math.ceil(resetIn / 1000)} 秒后重试` },
        { status: 429 }
      )
    }

    const body = await req.json()
    const messages = validateMessages(body.messages)

    // 截断历史消息，保留最近 20 条以避免超出上下文窗口
    const truncatedMessages = messages.slice(-20)

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `你是一位专业的面试辅导专家，拥有 10 年以上的人力资源和面试培训经验。你可以帮助用户：
1. 优化简历内容和结构
2. 提供面试技巧和策略
3. 模拟面试场景并给出反馈
4. 职业规划和薪资谈判建议
5. 针对特定岗位的面试准备建议

请用专业但友好的语气回答，给出具体可操作的建议。`,
        },
        ...truncatedMessages,
      ],
      stream: true,
    })

    // 流式响应
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of response) {
            const content = chunk.choices[0]?.delta?.content || ''
            if (content) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`))
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        } catch (error) {
          controller.error(error)
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'AI 响应失败'
    console.error('Chat error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
