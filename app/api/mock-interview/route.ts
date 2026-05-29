import { NextResponse } from 'next/server'
import { openai, MODEL } from '@/lib/openai'
import { checkRateLimit } from '@/lib/rate-limit'
import { validateMessages } from '@/lib/validate'

const INTERVIEWER_SYSTEM_PROMPT = `你是一位资深面试官，正在进行一场真实的模拟面试。你需要像真实面试一样与候选人对话。

## 面试规则
1. **一次只问一个问题**，等候选人回答后再继续
2. **根据回答追问**：如果回答不够深入，追问细节（"能具体说说吗？""数据是多少？""遇到什么困难？"）
3. **难度递进**：从简单的自我介绍开始，逐步深入到技术/项目/行为题
4. **模拟真实压力**：偶尔打断、质疑、追问数据和细节，但保持专业礼貌
5. **控制节奏**：每个问题的追问不超过2-3轮，然后自然过渡到下一个话题
6. **面试时长**：整场面试约8-12个问题（含追问），不要一次性列出所有问题

## 面试结构
- 开场：简短寒暄 + 请候选人自我介绍
- 中段：根据岗位和简历深入提问（技术/项目/行为各占比约 3:4:3）
- 收尾：反问环节 + 结束

## 回答格式
- 直接说面试官会说的话，不要加任何元描述（如"面试官说"）
- 语气自然、专业，像真人对话
- 追问时可以先简短评价（"嗯，不错"/"这个方向对"），再提出下一个问题

## 特殊指令
- 当你认为面试应该结束时（大约8-12轮对话后），在回复末尾加上 [INTERVIEW_END]
- 结束时给出简短的整体评价（2-3句话），不需要详细打分`

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown'
    const { allowed, resetIn } = checkRateLimit(`mock:${ip}`, { maxRequests: 40, windowMs: 60000 })
    if (!allowed) {
      return NextResponse.json(
        { error: `请求过于频繁，请 ${Math.ceil(resetIn / 1000)} 秒后重试` },
        { status: 429 }
      )
    }

    const body = await req.json()
    const { position, resumeText, messages: rawMessages } = body

    if (!position) {
      return NextResponse.json({ error: '缺少岗位信息' }, { status: 400 })
    }

    const messages = rawMessages ? validateMessages(rawMessages) : []

    // 构建上下文
    const contextInfo = [
      `面试岗位：${position}`,
      resumeText ? `候选人简历摘要：${resumeText.slice(0, 2000)}` : '',
    ].filter(Boolean).join('\n')

    const systemPrompt = `${INTERVIEWER_SYSTEM_PROMPT}\n\n## 本场面试信息\n${contextInfo}`

    // 如果是第一条消息（开场），自动生成面试官开场白
    const isFirstMessage = messages.length === 0

    const apiMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...(isFirstMessage
        ? [{ role: 'user' as const, content: '（面试开始，请面试官先开场）' }]
        : messages),
    ]

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: apiMessages,
      stream: true,
      temperature: 0.8,
      max_tokens: 1024,
      top_p: 0.9,
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
    const message = error instanceof Error ? error.message : '模拟面试失败'
    console.error('Mock interview error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
