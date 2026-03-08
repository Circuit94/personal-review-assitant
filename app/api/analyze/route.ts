import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: '未配置 OpenAI API Key，请在环境变量中设置 OPENAI_API_KEY' },
        { status: 500 }
      )
    }

    const { content, position, company } = await request.json()

    if (!content) {
      return NextResponse.json(
        { error: '请提供面试内容' },
        { status: 400 }
      )
    }

    const openai = new OpenAI({ apiKey })

    const contextParts: string[] = []
    if (company) contextParts.push(`公司: ${company}`)
    if (position) contextParts.push(`岗位: ${position}`)
    const contextStr = contextParts.length > 0 ? contextParts.join('，') + '\n\n' : ''

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `你是一位专业的面试教练和分析师。请对以下面试记录进行深入分析，使用中文回复。
请按以下格式输出分析结果：

## 面试总结
简要概述面试的整体情况。

## 关键问题
列出面试中被问到的主要问题。

## 回答评估
评估候选人的回答质量。

## 优势
列出候选人在面试中展现的优势。

## 待改进之处
列出需要改进的地方。

## 建议
给出具体的改进建议，帮助候选人在未来的面试中表现更好。`
        },
        {
          role: 'user',
          content: `${contextStr}面试记录内容：\n\n${content}`
        }
      ],
    })

    const analysis = response.choices[0]?.message?.content || '分析失败，请重试'

    return NextResponse.json({ analysis })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '分析失败，请重试'
    console.error('Analysis error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
