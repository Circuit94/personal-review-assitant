import { streamText, convertToModelMessages } from 'ai'
import { openai } from '@ai-sdk/openai'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const {
      messages,
      resumeContent,
      interviewHistory,
      systemPrompt,
    } = await req.json()

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return new Response('Unauthorized', { status: 401 })
    }

    // Build system context with resume and interview history
    let systemContext = systemPrompt || '你是一位经验丰富的面试辅导专家。'

    if (resumeContent) {
      systemContext += `\n\n用户的简历内容：\n${resumeContent}`
    }

    if (interviewHistory && interviewHistory.length > 0) {
      systemContext += `\n\n用户过往的面试记录：\n${interviewHistory}`
    }

    systemContext +=
      '\n\n请根据用户的简历和面试经历，给出针对性的建议和回答。'

    const result = streamText({
      model: openai('gpt-4'),
      system: systemContext,
      messages: await convertToModelMessages(messages),
    })

    return result.toUIMessageStreamResponse()
  } catch (error) {
    console.error('Chat error:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}
