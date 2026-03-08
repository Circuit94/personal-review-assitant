import { NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    const openai = new OpenAI({ apiKey })

    const { text, company, position } = await request.json()

    if (!text) {
      return NextResponse.json(
        { error: 'No text provided for analysis' },
        { status: 400 }
      )
    }

    const systemPrompt = `你是一位资深的面试教练和职业顾问。请分析以下面试录音转写文本，提供详细的面试复盘分析。

请从以下几个方面进行分析：
1. **回答质量**：评估面试者的回答是否清晰、有条理、有深度
2. **关键亮点**：指出面试者表现好的地方
3. **改进建议**：指出需要改进的地方，并给出具体建议
4. **常见问题应对**：如果涉及常见面试问题，评估回答策略
5. **整体评分**：给出1-10分的整体表现评分

请用中文回答，格式清晰易读。`

    const userPrompt = `${company ? `公司：${company}` : ''}${position ? `\n岗位：${position}` : ''}

面试录音转写内容：
${text}`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    })

    const analysis = completion.choices[0]?.message?.content || '分析生成失败'

    return NextResponse.json({ analysis })
  } catch (error) {
    console.error('Analysis error:', error)
    const message =
      error instanceof Error ? error.message : 'Analysis failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
