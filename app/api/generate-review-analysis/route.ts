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
你是一位资深的面试教练和职业发展顾问。请根据以下用户的面试记录和模拟面试数据，生成一份深度复盘分析报告，包含定性分析和量化指标。

面试记录（最近 10 条）：
${JSON.stringify(interviewRecords?.slice(0, 10) || [], null, 2).slice(0, 3000)}

模拟面试问答（最近 20 条）：
${JSON.stringify(mockQuestions?.slice(0, 20) || [], null, 2).slice(0, 4000)}

请从以下维度进行分析：

一、定性分析：
1. 总体评价：概括用户当前的面试表现水平和进步趋势
2. 核心优势：用户在面试中展现的 3-5 个突出优点
3. 待提升项：需要重点改进的 3-5 个方面
4. 具体建议：针对每个待提升项给出可操作的改进方案

二、量化指标（请根据数据合理评估，0-100 分）：
1. overall_score: 综合面试表现分数
2. dimensions: 多维度评分（技术深度、表达清晰度、逻辑结构、项目经验、应变能力、自我认知）
3. star_usage_rate: STAR 法则使用率（0-100，评估回答中使用情境-任务-行动-结果结构的比例）
4. weak_points: 薄弱知识点列表（每个包含名称和掌握程度分数）
5. improvement_trend: 相比上次的进步趋势（-10 到 +10）

请以 JSON 格式返回：
{
  "summary": "总体评价文本",
  "strengths": ["优势1", "优势2", "优势3"],
  "weaknesses": ["待提升项1", "待提升项2", "待提升项3"],
  "suggestions": ["建议1", "建议2", "建议3"],
  "metrics": {
    "overall_score": 72,
    "dimensions": [
      {"name": "技术深度", "score": 75},
      {"name": "表达清晰度", "score": 68},
      {"name": "逻辑结构", "score": 70},
      {"name": "项目经验", "score": 80},
      {"name": "应变能力", "score": 65},
      {"name": "自我认知", "score": 72}
    ],
    "star_usage_rate": 45,
    "weak_points": [
      {"name": "系统设计", "score": 40},
      {"name": "算法复杂度分析", "score": 55}
    ],
    "improvement_trend": 5
  }
}
`

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: '你是一位资深的面试教练，请严格按照 JSON 格式输出分析报告，包含定性分析和量化指标。所有分数为 0-100 的整数。' },
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
