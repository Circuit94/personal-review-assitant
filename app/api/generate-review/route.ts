import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const { daysBack = 7 } = await req.json()

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return new Response('Unauthorized', { status: 401 })
    }

    // Fetch recent interview notes and mock interviews
    const dateFrom = new Date()
    dateFrom.setDate(dateFrom.getDate() - daysBack)

    const { data: notes } = await supabase
      .from('interview_notes')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', dateFrom.toISOString())
      .order('created_at', { ascending: false })

    const { data: mockInterviews } = await supabase
      .from('mock_interviews')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', dateFrom.toISOString())
      .order('created_at', { ascending: false })

    let interviewData = ''

    if (notes && notes.length > 0) {
      interviewData += '近期面试记录：\n'
      notes.forEach((note) => {
        interviewData += `- ${note.company} (${note.position}): ${note.notes}\n`
      })
      interviewData += '\n'
    }

    if (mockInterviews && mockInterviews.length > 0) {
      interviewData += '模拟面试练习：\n'
      mockInterviews.forEach((interview) => {
        interviewData += `- ${interview.job_title}: ${interview.questions.length} 道题目\n`
      })
    }

    if (!interviewData) {
      return Response.json({
        summary: '该时间段内暂无面试记录，请继续完成面试练习和记录。',
        weaknesses: [],
        suggestions: [],
      })
    }

    const result = await generateText({
      model: openai('gpt-4'),
      system: `你是一位专业的面试教练。请分析用户最近的面试记录和练习情况，
找出主要的弱点并提供具体的改进建议。请用中文回答。`,
      prompt: `请分析以下面试记录，并提供改进建议：

${interviewData}

请按以下格式回答：
1. 总体评价（一句话）
2. 主要弱点（列举 3-5 个）
3. 改进建议（具体、可执行的建议）`,
    })

    // Save the review
    const { error: saveError } = await supabase
      .from('interview_reviews')
      .insert({
        user_id: user.id,
        review_content: result.text,
        review_period_days: daysBack,
      })

    if (saveError) throw saveError

    return Response.json({
      summary: result.text,
    })
  } catch (error) {
    console.error('Review generation error:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}
