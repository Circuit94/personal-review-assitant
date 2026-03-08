import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_API_BASE || 'https://api.openai.com/v1',
})

export async function POST(req: Request) {
  try {
    const { question, answer } = await req.json()

    const prompt = `
      面试题目: ${question}
      候选人回答: ${answer}

      作为面试官，请对候选人的回答进行点评。
      要求:
      1. 指出回答中的亮点。
      2. 指出可以改进的地方。
      3. 给出一个更专业的回答建议。
      4. 语气要专业且客观。
    `

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: '你是一位资深的面试官，擅长提供建设性的面试反馈。' },
        { role: 'user', content: prompt },
      ],
    })

    return NextResponse.json({ feedback: response.choices[0].message.content })
  } catch (error: any) {
    console.error('Feedback error:', error)
    return NextResponse.json({ error: '获取反馈失败' }, { status: 500 })
  }
}
