import { NextResponse } from 'next/server'
import { openai, MODEL } from '@/lib/openai'
import { checkRateLimit } from '@/lib/rate-limit'
import { validateString } from '@/lib/validate'

export async function POST(req: Request) {
  try {
    // 速率限制
    const ip = req.headers.get('x-forwarded-for') || 'unknown'
    const { allowed } = checkRateLimit(`feedback:${ip}`, { maxRequests: 20, windowMs: 60000 })
    if (!allowed) {
      return NextResponse.json({ error: '请求过于频繁，请稍后重试' }, { status: 429 })
    }

    const body = await req.json()
    const question = validateString(body.question, '面试题目', { maxLength: 2000 })
    const answer = validateString(body.answer, '回答内容', { maxLength: 5000 })

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `你是一位经验丰富的面试官，正在对候选人的回答进行专业点评。
请从以下维度给出反馈：
1. 亮点：回答中做得好的地方
2. 改进点：可以优化的方面
3. 专业建议：如何让回答更加出色
4. 参考答案要点：这道题的理想回答应该包含哪些关键点

请用友好但专业的语气，给出具体可操作的建议。`,
        },
        {
          role: 'user',
          content: `面试题目：${question}\n\n候选人回答：${answer}`,
        },
      ],
    })

    const feedback = response.choices[0].message.content
    return NextResponse.json({ feedback })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '获取反馈失败'
    console.error('Error getting feedback:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
