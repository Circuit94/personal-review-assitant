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

    const maxRetries = 3
    let lastError = null
    let content = null

    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await openai.chat.completions.create({
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: '你是一位资深的面试官助手。' },
            { role: 'user', content: prompt },
          ],
          response_format: { type: 'json_object' },
          timeout: 10000, // 10s timeout
        })

        content = response.choices[0].message.content
        if (content) break
      } catch (err: any) {
        lastError = err
        console.warn(`Retry ${i + 1} failed:`, err.message)
        // Wait a bit before retry
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    if (!content) {
      // Fallback: Return some generic questions if AI fails
      console.error('AI generation failed after retries, using fallback.')
      return NextResponse.json({
        questions: [
          { id: 1, question: "请做一个简单的自我介绍。", type: "behavioral" },
          { id: 2, question: "你为什么申请这个岗位？", type: "behavioral" },
          { id: 3, question: "你认为自己最大的优势是什么？", type: "behavioral" },
          { id: 4, question: "在过去的项目中，你遇到过最大的挑战是什么？你是如何解决的？", type: "project" },
          { id: 5, question: "你对未来的职业规划是什么？", type: "behavioral" }
        ],
        fallback: true
      })
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
