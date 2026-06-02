import { NextResponse } from 'next/server'
import { openai, MODEL } from '@/lib/openai'
import { checkRateLimit } from '@/lib/rate-limit'
import { verifyToken } from '@/lib/auth'
import supabaseAdmin from '@/lib/db'

// 面试官系统提示词（根据设置动态生成）
function buildInterviewerPrompt(settings: {
  position: string
  resumeText?: string
  skipIntro: boolean
  focusAreas: string[]
  difficulty: string
  questionCount: number
  customInstructions?: string
}) {
  const difficultyMap: Record<string, string> = {
    easy: '基础难度，以开放式问题为主，适当引导候选人',
    medium: '中等难度，会追问细节和数据，考察深度',
    hard: '高难度，频繁追问、质疑、压力测试，考察极限能力',
  }

  const focusDesc = settings.focusAreas.length > 0
    ? `重点考察方向：${settings.focusAreas.join('、')}`
    : '综合考察项目经验、技术深度和行为素质'

  const introInstruction = settings.skipIntro
    ? '跳过自我介绍环节，直接从项目/技术/行为题开始提问。开场简短寒暄后立即进入正题。'
    : '从请候选人自我介绍开始，根据自我介绍内容深入追问。'

  return `你是一位资深面试官，正在进行一场真实的模拟面试。

## 面试规则
1. **一次只问一个问题**，等候选人回答后再继续
2. **根据回答追问**：如果回答不够深入，追问细节
3. **难度设置**：${difficultyMap[settings.difficulty] || difficultyMap.medium}
4. **控制节奏**：每个问题的追问不超过2-3轮，然后自然过渡
5. **面试时长**：整场面试约 ${settings.questionCount} 个问题（含追问）

## 面试结构
- ${introInstruction}
- ${focusDesc}
- 收尾：反问环节 + 结束

## 回答格式要求
直接说面试官会说的话，语气自然、专业、像真人对话。
不要加任何元描述（如"面试官说"）。
追问时可以先简短评价再提出下一个问题。

## 选项生成规则
每次提问后，你必须在回复末尾生成 **恰好3个后续选项**，格式如下：
[OPTIONS]
1. followup: <追问方向描述>
2. switch_topic: <换一个话题方向描述>
3. end: 结束面试
[/OPTIONS]

选项要具体、有针对性。比如：
- followup: 追问这个项目中遇到的最大技术难题
- switch_topic: 聊聊团队协作和沟通能力

${settings.customInstructions ? `\n## 用户自定义要求\n${settings.customInstructions}` : ''}

## 特殊指令
- 当面试自然结束时（约${settings.questionCount}轮），在回复末尾加 [INTERVIEW_END]
- 结束时给出简短整体评价

## 本场面试信息
面试岗位：${settings.position}
${settings.resumeText ? `候选人简历摘要：${settings.resumeText.slice(0, 2000)}` : '无简历信息，进行通用面试'}`
}

/**
 * 获取用户信息库上下文（项目经历、技能特长等）注入面试官
 */
async function getInfoBankContext(userId: string): Promise<string> {
  try {
    const { data: infoFields } = await supabaseAdmin
      .from('info_fields')
      .select('label, value, module_id')
      .eq('user_id', userId)
      .neq('value', '')
      .limit(20)

    if (!infoFields || infoFields.length === 0) return ''

    const moduleIds = [...new Set(infoFields.map((f) => f.module_id))]
    const { data: modules } = await supabaseAdmin
      .from('info_modules')
      .select('id, name')
      .in('id', moduleIds)

    const moduleMap = new Map((modules || []).map((m) => [m.id, m.name]))

    const infoSummary = infoFields.map((f) =>
      `- [${moduleMap.get(f.module_id) || '其他'}] ${f.label}: ${(f.value as string).slice(0, 200)}`
    ).join('\n')

    return `\n\n## 候选人背景补充（来自个人素材库）\n${infoSummary}`
  } catch (error) {
    console.error('Failed to load info bank for mock:', error)
    return ''
  }
}

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown'
    const { allowed, resetIn } = checkRateLimit(`mock:${ip}`, { maxRequests: 40, windowMs: 60000 })
    if (!allowed) {
      return NextResponse.json(
        { error: `请求过于频繁，请 ${Math.ceil(resetIn / 1000)} 秒后重试` },
        { status: 429 }
      )
    }

    const body = await req.json()
    const {
      position,
      resumeText,
      messages: rawMessages,
      settings,
      selectedOption,
    } = body

    if (!position) {
      return NextResponse.json({ error: '缺少岗位信息' }, { status: 400 })
    }

    // 尝试获取用户身份，注入信息库上下文
    let infoBankContext = ''
    const authHeader = req.headers.get('authorization')
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const payload = verifyToken(token)
      if (payload?.id) {
        infoBankContext = await getInfoBankContext(payload.id)
      }
    }

    // 构建系统提示词
    const interviewSettings = {
      position,
      resumeText: resumeText ? `${resumeText}${infoBankContext}` : (infoBankContext || undefined),
      skipIntro: settings?.skipIntro ?? false,
      focusAreas: settings?.focusAreas ?? [],
      difficulty: settings?.difficulty ?? 'medium',
      questionCount: settings?.questionCount ?? 10,
      customInstructions: settings?.customInstructions,
    }
    const systemPrompt = buildInterviewerPrompt(interviewSettings)

    // 处理消息历史
    const messages = Array.isArray(rawMessages) && rawMessages.length > 0
      ? rawMessages.map((msg: { role: string; content: string }) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        }))
      : []

    const isFirstMessage = messages.length === 0

    // 如果用户选择了选项，将其作为隐含的用户指令
    let userDirective = ''
    if (selectedOption) {
      if (selectedOption.type === 'followup') {
        userDirective = `（候选人选择了追问方向：${selectedOption.label}，请按此方向提问）`
      } else if (selectedOption.type === 'switch_topic') {
        userDirective = `（候选人希望换方向：${selectedOption.label}，请切换话题提问）`
      } else if (selectedOption.type === 'end') {
        userDirective = '（候选人选择结束面试，请给出结束语和整体评价，在末尾加上 [INTERVIEW_END]）'
      } else if (selectedOption.type === 'custom') {
        userDirective = `（候选人自定义请求：${selectedOption.label}）`
      }
    }

    const apiMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...(isFirstMessage
        ? [{ role: 'user' as const, content: `（面试开始${interviewSettings.skipIntro ? '，跳过自我介绍直接提问' : '，请面试官先开场'}）` }]
        : [
            ...messages,
            ...(userDirective ? [{ role: 'user' as const, content: userDirective }] : []),
          ]),
    ]

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: apiMessages,
      stream: true,
      temperature: 0.8,
      max_tokens: 1500,
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
    const message = error instanceof Error ? error.message : '模拟面试失败'
    console.error('Mock interview error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
