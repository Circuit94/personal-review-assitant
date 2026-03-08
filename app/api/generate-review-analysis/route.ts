import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_API_BASE || 'https://api.openai.com/v1',
})

export async function POST(req: Request) {
  try {
    const { interviewRecords, mockQuestions } = await req.json()

    const prompt = `
      请根据以下候选人的面试记录和模拟面试表现，生成一份周度复盘分析报告。
      
      真实面试记录:
      ${JSON.stringify(interviewRecords, null, 2)}
      
      模拟面试表现 (题目、回答及 AI 反馈):
      ${JSON.stringify(mockQuestions, null, 2)}

      要求:
      1. 生成一份包含总结、核心优势、待提升项、提升建议的分析报告。
      2. 以 JSON 格式返回，格式如下:
      {
        "summary": "总体评价和总结",
        "strengths": ["优势 1", "优势 2"],
        "weaknesses": ["待提升 1", "待提升 2"],
        "suggestions": ["建议 1", "建议 2"]
      }
    `

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: '你是一位资深的职业发展教练和面试专家。' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
    })

    const content = response.choices[0].message.content
    if (!content) throw new Error('AI 响应内容为空')

    return NextResponse.json(JSON.parse(content))
  } catch (error: any) {
    console.error('Analysis error:', error)
    return NextResponse.json({ error: '生成分析报告失败' }, { status: 500 })
  }
}
