import { NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import supabaseAdmin from '@/lib/db'

export async function GET(req: Request) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const [resumeRes, interviewRes, chatRes, audioRes] = await Promise.all([
    supabaseAdmin
      .from('resumes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id),
    supabaseAdmin
      .from('interview_records')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id),
    supabaseAdmin
      .from('chat_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('session_type', 'chat'),
    supabaseAdmin
      .from('interview_audio_records')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id),
  ])

  return NextResponse.json({
    resumes: resumeRes.count || 0,
    interviews: interviewRes.count || 0,
    chats: chatRes.count || 0,
    audios: audioRes.count || 0,
  })
}
