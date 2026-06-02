import { NextResponse } from 'next/server'
import { openai, MODEL } from '@/lib/openai'
import { checkRateLimit } from '@/lib/rate-limit'

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown'
    const { allowed, resetIn } = checkRateLimit(`jd-match:${ip}`, { maxRequests: 10, windowMs: 60000 })
    if (!allowed) {
      return NextResponse.json(
        { error: `请求过于频繁，请 ${Math.ceil(resetIn / 1000)} 秒后重试` },
        { status: 429 }
      )
    }

    const { resumeText, jdText } = await req.json()

    if (!resumeText || !jdText) {
      return NextResponse.json({ error: '请提供简历内容和 JD 内容' }, { status: 400 })
    }

    const systemPrompt = `你是一位专业的简历-JD匹配度分析师。请严格按以下 JSON 格式输出分析结果，不要输出任何其他内容：

{
  "score": <0-100的匹配度评分>,
  "summary": "<一句话总结匹配情况>",
  "matchedKeywords": ["<匹配的关键词1>", "<匹配的关键词2>", ...],
  "missingKeywords": ["<简历中缺失的JD关键词1>", "<缺失关键词2>", ...],
  "strengths": ["<优势1>", "<优势2>", ...],
  "suggestions": ["<具体可操作的优化建议1>", "<建议2>", "<建议3>", ...]
}

评分标准：
- 90-100: 高度匹配，核心技能完全覆盖
- 70-89: 较好匹配，大部分要求满足
- 50-69: 一般匹配，有明显缺口但有相关经验
- 30-49: 匹配度较低，需要较大调整
- 0-29: 不匹配

请从以下维度分析：
1. 硬技能匹配（技术栈、工具、方法论）
2. 行业/领域匹配
3. 经验年限匹配
4. 软技能匹配（沟通、领导力等）
5. 学历/证书要求`

    const userMessage = `## 候选人简历
${resumeText.slice(0, 3000)}

## 目标岗位 JD
${jdText.slice(0, 2000)}`

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    })

    const content = response.choices[0]?.message?.content || ''

    // 尝试解析 JSON
    try {
      // 提取 JSON（可能包含在 markdown code block 中）
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0])
        return NextResponse.json(result)
      }
      return NextResponse.json({ error: '分析结果格式异常', raw: content }, { status: 500 })
    } catch {
      return NextResponse.json({ error: '分析结果解析失败', raw: content }, { status: 500 })
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'JD匹配分析失败'
    console.error('JD match error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
