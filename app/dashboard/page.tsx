'use client'

import { useAuth } from '@/lib/auth-context'
import { Navbar } from '@/components/navbar'
import { ResumeUpload } from '@/components/resume-upload'
import { InterviewNotes } from '@/components/interview-notes'
import { AIChat } from '@/components/ai-chat'
import { MockInterview } from '@/components/mock-interview'
import { InterviewReview } from '@/components/interview-review'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function DashboardPage() {
  // Auth is now handled by middleware (redirects to /auth/login if not authenticated)
  // and AuthContext provides the user state globally
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg text-slate-500">加载中...</div>
      </div>
    )
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-slate-900 mb-2">
              欢迎回来！
            </h1>
            <p className="text-slate-600">
              准备好迎接面试挑战吧。上传简历、记录面试经验、与AI对话、进行模拟面试。
            </p>
          </div>

          <Tabs defaultValue="chat" className="space-y-4">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="chat">AI 聊天</TabsTrigger>
              <TabsTrigger value="mock">模拟面试</TabsTrigger>
              <TabsTrigger value="resume">简历管理</TabsTrigger>
              <TabsTrigger value="notes">面试记录</TabsTrigger>
              <TabsTrigger value="review">复盘分析</TabsTrigger>
            </TabsList>

            <TabsContent value="chat">
              <AIChat />
            </TabsContent>

            <TabsContent value="mock">
              <MockInterview />
            </TabsContent>

            <TabsContent value="resume">
              <ResumeUpload />
            </TabsContent>

            <TabsContent value="notes">
              <InterviewNotes />
            </TabsContent>

            <TabsContent value="review">
              <InterviewReview />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  )
}
