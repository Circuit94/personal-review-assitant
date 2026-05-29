import { NextResponse } from 'next/server'
import { openai, MODEL } from '@/lib/openai'
import { checkRateLimit } from '@/lib/rate-limit'

const SPRINT_PROMPT = `你是一位面试准备专家。用户即将参加面试，请根据公司和岗位信息，生成一份 30 分钟面试冲刺准备清单。

## 输出格式要求
请严格按照以下 JSON 格式输出，不要包含任何其他文字：

{
  "company_brief": "公司一句话介绍（业务、规模、文化特点）",
  "tasks": [
    {
      "time": "0-5min",
      "title": "任务标题",
      "description": "具体要做什么",
      "checklist": ["检查项1", "检查项2"]
    }
  ],
  "key_questions": ["可能被问到的高频问题1", "问题2", "问题3"],
  "talking_points": ["你应该主动提到的亮点1", "亮点2"],
  "red_flags": ["注意避免的雷区1", "雷区2"],
  "reverse_questions": ["你可以反问面试官的问题1", "问题2"]
}

## 时间分配建议
- 0-5min: 公司/岗位速查
- 5-15min: 核心问题准备
- 15-25min: 项目/经历梳理
- 25-30min: 心态调整 + 反问准备`

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown'
    const { allowed, resetIn } = checkRateLimit(`sprint:${ip}`, { maxRequests: 10, windowMs: 60000 })
    if (!allowed) {
      return NextResponse.json(
        { error: `请求过于频繁，请 ${Math.ceil(resetIn / 1000)} 秒后重试` },
        { status: 429 }
      )
    }

    const { company, position, resumeText } = await req.json()
    if (!company && !position) {
      return NextResponse.json({ error: '请至少提供公司或岗位信息' }, { status: 400 })
    }

    const userContext = [
      company ? `目标公司：${company}` : '',
      position ? `目标岗位：${position}` : '',
      resumeText ? `候选人简历摘要：${resumeText.slice(0, 1000)}` : '',
    ].filter(Boolean).join('\n')

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: SPRINT_PROMPT },
        { role: 'user', content: `请为以下面试生成 30 分钟冲刺准备清单：\n\n${userContext}` },
      ],
      temperature: 0.7,
      max_tokens: 2048,
    })

    const content = response.choices[0]?.message?.content || ''

    // 尝试解析 JSON
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        return NextResponse.json(parsed)
      }
    } catch {
      // JSON 解析失败，返回原始文本
    }

    return NextResponse.json({ raw: content })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '生成准备清单失败'
    console.error('Sprint error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
