import { NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import db from '@/lib/db'

export async function GET(req: Request) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const resumeCount = (
    db.prepare('SELECT COUNT(*) as count FROM resumes WHERE user_id = ?').get(user.id) as { count: number }
  ).count

  const interviewCount = (
    db.prepare('SELECT COUNT(*) as count FROM interview_records WHERE user_id = ?').get(user.id) as { count: number }
  ).count

  const chatCount = (
    db.prepare("SELECT COUNT(*) as count FROM chat_sessions WHERE user_id = ? AND session_type = 'chat'").get(user.id) as { count: number }
  ).count

  const audioCount = (
    db.prepare('SELECT COUNT(*) as count FROM interview_audio_records WHERE user_id = ?').get(user.id) as { count: number }
  ).count

  return NextResponse.json({
    resumes: resumeCount,
    interviews: interviewCount,
    chats: chatCount,
    audios: audioCount,
  })
}
