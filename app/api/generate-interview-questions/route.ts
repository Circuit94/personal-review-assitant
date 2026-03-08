import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_API_BASE || 'https://api.openai.com/v1',
})

export async function POST(req: Request) {
  try {
    const { position, resumeText } = await req.json()

    if (!position) {
      return NextResponse.json({ error: '请提供岗位名称' }, { status: 400 })
    }

    const prompt = `
      你是一位资深的面试官。请根据以下信息生成 5 个针对性的面试题目。
      岗位: ${position}
      ${resumeText ? `简历内容: ${resumeText}` : ''}

      要求:
      1. 题目要有深度，涵盖技术、项目经验和行为面试（Behavioral Interview）。
      2. 以 JSON 格式返回，格式如下:
      {
        "questions": [
          {
            "id": 1,
            "question": "题目内容",
            "type": "technical/project/behavioral"
          }
        ]
      }
    `

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: '你是一位资深的面试官助手。' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
    })

    const content = response.choices[0].message.content
    if (!content) {
      throw new Error('AI 生成内容为空')
    }

    return NextResponse.json(JSON.parse(content))
  } catch (error: any) {
    console.error('Error generating questions:', error)
    return NextResponse.json(
      { error: '生成面试题目失败', details: error.message },
      { status: 500 }
    )
  }
}
