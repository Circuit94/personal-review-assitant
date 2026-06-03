import { NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { openai, MODEL } from '@/lib/openai'

export async function POST(req: Request) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { question, answer, jd_reference } = await req.json()

  if (!question?.trim() || !answer?.trim()) {
    return NextResponse.json({ error: '问题和回答不能为空' }, { status: 400 })
  }

  const systemPrompt = `你是一位资深面试辅导专家。用户正在准备面试，需要你帮助优化他们对面试问题的回答。

优化要求：
1. 保持回答的核心内容和个人经历不变
2. 使用 STAR 法则（情境-任务-行动-结果）优化结构
3. 让回答更加简洁有力，突出亮点
4. 加入量化数据（如果原回答中有相关信息）
5. 确保回答控制在 2-3 分钟口述时长内（约 300-500 字）
6. 语言自然流畅，适合口头表达

${jd_reference ? `参考 JD 要求：\n${jd_reference}\n\n请根据 JD 中的关键要求，调整回答的侧重点，突出与岗位匹配的能力和经验。` : ''}

请直接输出优化后的回答，不要加任何前缀说明。`

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `面试问题：${question}\n\n我的回答：${answer}` },
      ],
      temperature: 0.7,
      max_tokens: 1500,
    })

    const optimizedAnswer = completion.choices[0]?.message?.content?.trim()

    if (!optimizedAnswer) {
      return NextResponse.json({ error: 'AI 未返回有效内容' }, { status: 500 })
    }

    return NextResponse.json({ optimized_answer: optimizedAnswer })
  } catch (error: unknown) {
    console.error('Flashcard optimize error:', error)
    const message = error instanceof Error ? error.message : 'AI 优化失败'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
