import { NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'

export async function POST(req: Request) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { company, position, jd } = await req.json()

  if (!position && !jd) {
    return NextResponse.json({ error: '请至少提供岗位名称或 JD' }, { status: 400 })
  }

  const prompt = `你是一个面试设置推荐助手。根据以下信息，为用户推荐最合适的模拟面试设置。

${company ? `公司：${company}` : ''}
${position ? `岗位：${position}` : ''}
${jd ? `岗位 JD：\n${jd}` : ''}

请根据以上信息，返回一个 JSON 对象，包含以下字段：
- position: string（精炼的岗位名称，如"高级前端工程师"）
- skipIntro: boolean（是否跳过自我介绍，如果JD强调沟通能力则false）
- focusAreas: string[]（从以下选项中选择最相关的2-4个：project, technical, behavioral, system_design, product, leadership）
- difficulty: "easy" | "medium" | "hard"（根据岗位级别判断，高级/资深选hard，初级选easy）
- questionCount: number（5-20之间，根据面试深度决定）
- customInstructions: string（基于JD生成的额外面试要求，如"重点考察微服务架构设计经验"、"关注数据驱动决策能力"等，简洁一句话）

只返回 JSON，不要其他内容。`

  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 500,
      }),
    })

    if (!response.ok) {
      throw new Error('AI 服务请求失败')
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''

    // 提取 JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('无法解析 AI 返回的设置')
    }

    const recommended = JSON.parse(jsonMatch[0])

    // 校验和限制字段
    const result = {
      position: recommended.position || position || '',
      skipIntro: typeof recommended.skipIntro === 'boolean' ? recommended.skipIntro : false,
      focusAreas: Array.isArray(recommended.focusAreas)
        ? recommended.focusAreas.filter((a: string) =>
            ['project', 'technical', 'behavioral', 'system_design', 'product', 'leadership'].includes(a)
          )
        : [],
      difficulty: ['easy', 'medium', 'hard'].includes(recommended.difficulty) ? recommended.difficulty : 'medium',
      questionCount: Math.min(20, Math.max(5, Number(recommended.questionCount) || 10)),
      customInstructions: recommended.customInstructions || '',
    }

    return NextResponse.json(result)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '推荐设置生成失败'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
