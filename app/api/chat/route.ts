import { NextResponse } from 'next/server'
import { openai, MODEL } from '@/lib/openai'
import { checkRateLimit } from '@/lib/rate-limit'
import { validateMessages } from '@/lib/validate'

const SYSTEM_PROMPT = `你是一位资深面试辅导专家，拥有 10 年以上人力资源和面试培训经验，曾帮助数千名候选人成功拿到 offer。

## 你的核心能力
- 简历优化：结构、措辞、量化成果
- 面试技巧：行为面试（STAR法则）、技术面试、压力面试、群面
- 薪资谈判：市场调研、谈判策略、counter offer
- 职业规划：行业分析、转行建议、晋升路径

## 回答要求
1. **深度优先**：不要泛泛而谈，给出具体、可操作的建议。用实例说明。
2. **结构清晰**：复杂问题分步骤回答，使用标题和要点。
3. **个性化**：根据用户的具体情况（岗位、行业、经验）定制建议，而非通用模板。
4. **坦诚务实**：如果用户的想法有风险，直接指出并给出替代方案。
5. **追问引导**：如果用户问题太宽泛，先给出框架性回答，再追问关键细节以便给出更精准的建议。

## 回答风格
- 专业但不刻板，像一位经验丰富的前辈在指导你
- 适当使用具体数据和案例增强说服力
- 每次回答控制在合理长度，重点突出，避免冗长的废话`

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
        { role: 'system', content: SYSTEM_PROMPT },
        ...truncatedMessages,
      ],
      stream: true,
      temperature: 0.7,
      max_tokens: 2048,
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
    const message = error instanceof Error ? error.message : 'AI 响应失败'
    console.error('Chat error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
