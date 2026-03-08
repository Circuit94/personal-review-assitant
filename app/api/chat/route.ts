import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_API_BASE || 'https://api.openai.com/v1',
})

export async function POST(req: Request) {
  try {
    const { messages } = await req.json()

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: '你是一位专业的面试辅导专家。你可以回答关于面试技巧、简历优化、职业规划等方面的问题。' },
        ...messages,
      ],
    })

    return NextResponse.json({ content: response.choices[0].message.content })
  } catch (error: any) {
    console.error('Chat error:', error)
    return NextResponse.json({ error: 'AI 响应失败' }, { status: 500 })
  }
}
