import { generateText, Output } from 'ai'
import { openai } from '@ai-sdk/openai'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const InterviewQuestionsSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string(),
      difficulty: z.enum(['easy', 'medium', 'hard']),
      category: z.string(),
    })
  ),
})

export async function POST(req: Request) {
  try {
    const { jobTitle, jobDescription } = await req.json()

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return new Response('Unauthorized', { status: 401 })
    }

    const result = await generateText({
      model: openai('gpt-4'),
      system: `你是一位专业的面试官和招聘专家。请为指定的岗位生成5道精心设计的面试题目。
每道题目应该涵盖不同的方面（技能、经验、行为、问题解决等）。`,
      prompt: `请为以下岗位生成5道面试题目：

岗位：${jobTitle}
${jobDescription ? `岗位描述：${jobDescription}` : ''}

请以 JSON 格式返回，包含 questions 数组，每个元素包含 question、difficulty 和 category 字段。`,
      output: Output.object({
        schema: InterviewQuestionsSchema,
      }),
    })

    // Save interview session
    const { data: sessionData, error: sessionError } = await supabase
      .from('mock_interviews')
      .insert({
        user_id: user.id,
        job_title: jobTitle,
        job_description: jobDescription,
        questions: result.object.questions,
      })
      .select()

    if (sessionError) throw sessionError

    return Response.json({
      sessionId: sessionData?.[0]?.id,
      questions: result.object.questions,
    })
  } catch (error) {
    console.error('Interview generation error:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}
