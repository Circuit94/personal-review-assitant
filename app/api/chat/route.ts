import { NextResponse } from 'next/server'
import { openai, MODEL } from '@/lib/openai'
import { checkRateLimit } from '@/lib/rate-limit'
import { validateMessages } from '@/lib/validate'
import { verifyToken } from '@/lib/auth'
import supabaseAdmin from '@/lib/db'

const BASE_SYSTEM_PROMPT = `你是一位资深面试辅导专家，拥有 10 年以上人力资源和面试培训经验，曾帮助数千名候选人成功拿到 offer。

## 你的核心能力
- 简历优化：结构、措辞、量化成果
- 面试技巧：行为面试（STAR法则）、技术面试、压力面试、群面
- 薪资谈判：市场调研、谈判策略、counter offer
- 职业规划：行业分析、转行建议、晋升路径

## 回答要求
1. **深度优先**：不要泛泛而谈，给出具体、可操作的建议。用实例说明。
2. **结构清晰**：复杂问题分步骤回答，使用标题和要点。
3. **个性化**：根据用户的具体情况（岗位、行业、经验）定制建议，而非通用模板。
4. **坦诚务实**：如果用户的想法有风险，直接指出并给出替代方案。
5. **追问引导**：如果用户问题太宽泛，先给出框架性回答，再追问关键细节以便给出更精准的建议。

## 回答风格
- 专业但不刻板，像一位经验丰富的前辈在指导你
- 适当使用具体数据和案例增强说服力
- 每次回答控制在合理长度，重点突出，避免冗长的废话`

/**
 * 获取用户的个性化上下文（简历 + 面试记录 + 个人信息）
 */
async function getUserContext(userId: string): Promise<string> {
  const contextParts: string[] = []

  try {
    // 1. 获取简历摘要
    const { data: resume } = await supabaseAdmin
      .from('resumes')
      .select('extracted_text')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()

    if (resume?.extracted_text) {
      const resumeText = (resume.extracted_text as string).slice(0, 1500)
      contextParts.push(`## 用户简历摘要\n${resumeText}`)
    }

    // 2. 获取最近的面试记录（最近5条）
    const { data: interviews } = await supabaseAdmin
      .from('interview_records')
      .select('title, company, position, interview_date')
      .eq('user_id', userId)
      .order('interview_date', { ascending: false })
      .limit(5)

    if (interviews && interviews.length > 0) {
      const interviewSummary = interviews.map((r) => {
        const parts = [
          r.company ? `公司: ${r.company}` : '',
          r.position ? `岗位: ${r.position}` : '',
          r.interview_date ? `日期: ${r.interview_date}` : '',
          r.title ? `标题: ${r.title}` : '',
        ].filter(Boolean).join(' | ')
        return `- ${parts}`
      }).join('\n')
      contextParts.push(`## 最近面试记录\n${interviewSummary}`)
    }

    // 3. 获取个人信息库关键字段
    const { data: infoFields } = await supabaseAdmin
      .from('info_fields')
      .select('label, value, module_id')
      .eq('user_id', userId)
      .neq('value', '')
      .limit(20)

    if (infoFields && infoFields.length > 0) {
      // 获取对应的模块名
      const moduleIds = [...new Set(infoFields.map((f) => f.module_id))]
      const { data: modules } = await supabaseAdmin
        .from('info_modules')
        .select('id, name')
        .in('id', moduleIds)

      const moduleMap = new Map((modules || []).map((m) => [m.id, m.name]))

      const infoSummary = infoFields.map((f) =>
        `- [${moduleMap.get(f.module_id) || '未知'}] ${f.label}: ${(f.value as string).slice(0, 200)}`
      ).join('\n')
      contextParts.push(`## 用户个人信息\n${infoSummary}`)
    }

    // 4. 获取模拟面试中的薄弱点
    const { data: recentSessions } = await supabaseAdmin
      .from('chat_sessions')
      .select('id')
      .eq('user_id', userId)
      .limit(10)

    if (recentSessions && recentSessions.length > 0) {
      const sessionIds = recentSessions.map((s) => s.id)
      const { data: recentFeedback } = await supabaseAdmin
        .from('mock_interview_questions')
        .select('question, ai_feedback')
        .in('session_id', sessionIds)
        .not('ai_feedback', 'is', null)
        .order('created_at', { ascending: false })
        .limit(3)

      if (recentFeedback && recentFeedback.length > 0) {
        const feedbackSummary = recentFeedback.map((f) =>
          `- 问题: ${(f.question as string).slice(0, 80)}\n  反馈: ${(f.ai_feedback as string).slice(0, 150)}`
        ).join('\n')
        contextParts.push(`## 最近模拟面试反馈（薄弱点参考）\n${feedbackSummary}`)
      }
    }
  } catch (error) {
    console.error('Failed to load user context:', error)
  }

  if (contextParts.length === 0) return ''

  return `\n\n---\n## 以下是该用户的个人背景信息（请据此提供个性化建议，但不要主动复述这些信息）\n\n${contextParts.join('\n\n')}`
}

export async function POST(req: Request) {
  try {
    // 速率限制（基于 IP）
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const { allowed, resetIn } = checkRateLimit(`chat:${ip}`, { maxRequests: 30, windowMs: 60000 })
    if (!allowed) {
      return NextResponse.json(
        { error: `请求过于频繁，请 ${Math.ceil(resetIn / 1000)} 秒后重试` },
        { status: 429 }
      )
    }

    const body = await req.json()
    const messages = validateMessages(body.messages)

    // 尝试获取用户身份以加载个性化上下文
    let userContext = ''
    const authHeader = req.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7)
      try {
        const payload = verifyToken(token)
        if (payload?.id) {
          userContext = await getUserContext(payload.id)
        }
      } catch {
        // token 无效不影响聊天，只是没有个性化上下文
      }
    }

    const systemPrompt = BASE_SYSTEM_PROMPT + userContext

    // 截断历史消息，保留最近 20 条以避免超出上下文窗口
    const truncatedMessages = messages.slice(-20)

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        ...truncatedMessages,
      ],
      stream: true,
      temperature: 0.7,
      max_tokens: 2048,
      top_p: 0.9,
    })

    // 流式响应
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of response) {
            const content = chunk.choices[0]?.delta?.content || ''
            if (content) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`))
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        } catch (error) {
          controller.error(error)
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'AI 响应失败'
    console.error('Chat error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
