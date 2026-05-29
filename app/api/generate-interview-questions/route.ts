import { NextResponse } from 'next/server'
import { openai, MODEL } from '@/lib/openai'
import { checkRateLimit } from '@/lib/rate-limit'
import { validateString } from '@/lib/validate'

export async function POST(req: Request) {
  try {
    // 速率限制
    const ip = req.headers.get('x-forwarded-for') || 'unknown'
    const { allowed } = checkRateLimit(`gen-questions:${ip}`, { maxRequests: 10, windowMs: 60000 })
    if (!allowed) {
      return NextResponse.json({ error: '请求过于频繁，请稍后重试' }, { status: 429 })
    }

    const body = await req.json()
    const position = validateString(body.position, '岗位名称', { maxLength: 100 })
    const resumeText = typeof body.resumeText === 'string' ? body.resumeText.slice(0, 3000) : ''

    const prompt = `
你是一位资深的面试官，拥有丰富的技术面试和行为面试经验。请根据以下信息生成 5 个高质量的面试题目。

岗位: ${position}
${resumeText ? `候选人简历摘要: ${resumeText}` : ''}

要求:
1. 题目要有深度，涵盖技术能力、项目经验和行为面试（Behavioral Interview）。
2. 技术题应结合岗位实际工作场景，而非纯理论。
3. 行为面试题应使用 STAR 法则可回答的形式。
4. 以 JSON 格式返回，格式如下:
{
  "questions": [
    { "id": 1, "question": "题目内容", "type": "technical" },
    { "id": 2, "question": "题目内容", "type": "project" },
    { "id": 3, "question": "题目内容", "type": "behavioral" }
  ]
}
`

    const maxRetries = 3
    let content: string | null = null

    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await openai.chat.completions.create({
          model: MODEL,
          messages: [
            { role: 'system', content: '你是一位资深的面试官助手，请严格按照 JSON 格式输出。' },
            { role: 'user', content: prompt },
          ],
          response_format: { type: 'json_object' },
        })

        content = response.choices[0].message.content
        if (content) break
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : 'Unknown error'
        console.warn(`Retry ${i + 1} failed:`, errMsg)
        await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)))
      }
    }

    if (!content) {
      // Fallback: 返回通用面试题
      console.error('AI generation failed after retries, using fallback.')
      return NextResponse.json({
        questions: [
          { id: 1, question: '请做一个简单的自我介绍，重点突出与该岗位相关的经验。', type: 'behavioral' },
          { id: 2, question: '你为什么申请这个岗位？你认为自己最大的竞争优势是什么？', type: 'behavioral' },
          { id: 3, question: '请描述一个你在过去项目中遇到的最大技术挑战，你是如何解决的？', type: 'project' },
          { id: 4, question: '如果团队成员对技术方案有分歧，你通常如何推动达成共识？', type: 'behavioral' },
          { id: 5, question: '你对未来 3-5 年的职业规划是什么？', type: 'behavioral' },
        ],
        fallback: true,
      })
    }

    return NextResponse.json(JSON.parse(content))
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '生成面试题目失败'
    console.error('Error generating questions:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
