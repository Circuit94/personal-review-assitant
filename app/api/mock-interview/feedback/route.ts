import { NextResponse } from 'next/server'
import { openai, MODEL } from '@/lib/openai'
import { checkRateLimit } from '@/lib/rate-limit'

const FEEDBACK_SYSTEM_PROMPT = `你是面试辅导专家，需要对候选人的面试回答给出实时反馈。

## 输出格式要求
请严格按以下 JSON 格式输出（不要包含 markdown 代码块标记）：
{
  "score": <0-100的整数评分>,
  "framework": "<回答框架分析，如 STAR 法则使用情况、逻辑结构评价，2-3句话>",
  "strengths": ["<优点1>", "<优点2>"],
  "improvements": ["<改进点1>", "<改进点2>"],
  "optimizedAnswer": "<一个优化版的回答示范，保持候选人的核心内容但优化表达和结构，200字以内>"
}

## 评分标准
- 90-100：回答完美，结构清晰，有数据支撑，展现了深度思考
- 75-89：回答较好，结构基本完整，有一些亮点
- 60-74：回答一般，缺少深度或结构性
- 40-59：回答较弱，逻辑不清晰或过于笼统
- 0-39：回答很差，答非所问或完全不相关

## 注意事项
- 评价要具体、有建设性
- 优化版答案要实用，保持候选人的经历和内容真实性
- 如果是简短回答（如"好的"、"我想想"），给基础分并建议展开`

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown'
    const { allowed, resetIn } = checkRateLimit(`feedback:${ip}`, { maxRequests: 40, windowMs: 60000 })
    if (!allowed) {
      return NextResponse.json(
        { error: `请求过于频繁，请 ${Math.ceil(resetIn / 1000)} 秒后重试` },
        { status: 429 }
      )
    }

    const body = await req.json()
    const { question, answer, position, context } = body

    if (!question || !answer) {
      return NextResponse.json({ error: '缺少问题或回答内容' }, { status: 400 })
    }

    const userPrompt = `面试岗位：${position || '未指定'}
${context ? `面试上下文：${context}` : ''}

面试官问题：${question}

候选人回答：${answer}

请给出评估反馈（JSON格式）：`

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: FEEDBACK_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.6,
      max_tokens: 1000,
    })

    const content = response.choices[0]?.message?.content || ''

    // 尝试解析 JSON
    let feedback
    try {
      // 去除可能的 markdown 代码块标记
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      feedback = JSON.parse(cleanContent)
    } catch {
      // 如果 JSON 解析失败，返回基础反馈
      feedback = {
        score: 60,
        framework: '回答分析中...',
        strengths: ['有回答意愿'],
        improvements: ['建议补充具体细节和数据'],
        optimizedAnswer: content.slice(0, 200),
      }
    }

    return NextResponse.json({ feedback })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '反馈生成失败'
    console.error('Feedback error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
