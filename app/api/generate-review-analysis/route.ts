import { NextResponse } from 'next/server'
import { openai, MODEL } from '@/lib/openai'
import { checkRateLimit } from '@/lib/rate-limit'

export async function POST(req: Request) {
  try {
    // 速率限制
    const ip = req.headers.get('x-forwarded-for') || 'unknown'
    const { allowed } = checkRateLimit(`review-analysis:${ip}`, { maxRequests: 5, windowMs: 300000 })
    if (!allowed) {
      return NextResponse.json({ error: '生成过于频繁，请 5 分钟后重试' }, { status: 429 })
    }

    const { interviewRecords, mockQuestions } = await req.json()

    const prompt = `
你是一位资深的面试教练和职业发展顾问。请根据以下用户的面试记录和模拟面试数据，生成一份深度复盘分析报告。

面试记录（最近 10 条）：
${JSON.stringify(interviewRecords?.slice(0, 10) || [], null, 2).slice(0, 3000)}

模拟面试问答（最近 20 条）：
${JSON.stringify(mockQuestions?.slice(0, 20) || [], null, 2).slice(0, 4000)}

请从以下维度进行分析：
1. 总体评价：概括用户当前的面试表现水平和进步趋势
2. 核心优势：用户在面试中展现的 3-5 个突出优点
3. 待提升项：需要重点改进的 3-5 个方面
4. 具体建议：针对每个待提升项给出可操作的改进方案

请以 JSON 格式返回：
{
  "summary": "总体评价文本",
  "strengths": ["优势1", "优势2", "优势3"],
  "weaknesses": ["待提升项1", "待提升项2", "待提升项3"],
  "suggestions": ["建议1", "建议2", "建议3"]
}
`

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: '你是一位资深的面试教练，请严格按照 JSON 格式输出分析报告。' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
    })

    const content = response.choices[0].message.content
    if (!content) throw new Error('AI 未返回有效内容')

    return NextResponse.json(JSON.parse(content))
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '生成分析报告失败'
    console.error('Error generating review analysis:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
