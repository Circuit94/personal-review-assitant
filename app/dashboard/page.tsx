'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AIChat } from '@/components/AIChat'
import { MockInterview } from '@/components/MockInterview'
import { ResumeManager } from '@/components/ResumeManager'
import { InterviewRecords } from '@/components/InterviewRecords'
import { ReviewAnalysis } from '@/components/ReviewAnalysis'
import { LogOut, MessageSquare, Play, FileText, History, BarChart3, LayoutDashboard } from 'lucide-react'

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      window.location.href = '/'
      return
    }

    setUser(user)
    setLoading(false)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          加载中...
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 顶部导航 */}
      <header className="bg-white dark:bg-gray-800 border-b px-8 py-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="h-6 w-6 text-blue-600" />
            <h1 className="text-xl font-bold">面试助手</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:block">
              {user?.email}
            </span>
            <Button onClick={handleSignOut} variant="ghost" size="sm">
              <LogOut className="mr-2 h-4 w-4" />
              退出
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <TabsList className="bg-white dark:bg-gray-800 border shadow-sm h-12 p-1">
              <TabsTrigger value="overview" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 px-6">
                <LayoutDashboard className="mr-2 h-4 w-4" />
                概览
              </TabsTrigger>
              <TabsTrigger value="chat" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 px-6">
                <MessageSquare className="mr-2 h-4 w-4" />
                AI 聊天
              </TabsTrigger>
              <TabsTrigger value="mock" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 px-6">
                <Play className="mr-2 h-4 w-4" />
                模拟面试
              </TabsTrigger>
              <TabsTrigger value="resume" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 px-6">
                <FileText className="mr-2 h-4 w-4" />
                简历管理
              </TabsTrigger>
              <TabsTrigger value="records" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 px-6">
                <History className="mr-2 h-4 w-4" />
                面试记录
              </TabsTrigger>
              <TabsTrigger value="analysis" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 px-6">
                <BarChart3 className="mr-2 h-4 w-4" />
                复盘分析
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="col-span-1 lg:col-span-2 space-y-6">
                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-8 rounded-2xl shadow-lg">
                  <h2 className="text-3xl font-bold mb-4">欢迎回来，准备好迎接下一次面试了吗？</h2>
                  <p className="text-blue-100 mb-6 text-lg">
                    面试助手可以帮助您优化简历、模拟面试场景，并为您提供深度的复盘分析。
                  </p>
                  <Button variant="secondary" onClick={() => setActiveTab('mock')} className="h-11 px-8 font-semibold">
                    立即开始模拟面试
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div 
                    className="p-6 bg-white dark:bg-gray-800 rounded-xl border shadow-sm hover:shadow-md transition-all cursor-pointer"
                    onClick={() => setActiveTab('chat')}
                  >
                    <MessageSquare className="h-8 w-8 text-blue-500 mb-4" />
                    <h3 className="font-bold text-lg">AI 面试辅导</h3>
                    <p className="text-sm text-muted-foreground mt-2">
                      与 AI 专家交流面试技巧、职业规划和薪资谈判。
                    </p>
                  </div>
                  <div 
                    className="p-6 bg-white dark:bg-gray-800 rounded-xl border shadow-sm hover:shadow-md transition-all cursor-pointer"
                    onClick={() => setActiveTab('analysis')}
                  >
                    <BarChart3 className="h-8 w-8 text-green-500 mb-4" />
                    <h3 className="font-bold text-lg">智能复盘</h3>
                    <p className="text-sm text-muted-foreground mt-2">
                      基于您的历史记录，智能生成周度复盘报告和提升建议。
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="p-6 bg-white dark:bg-gray-800 rounded-xl border shadow-sm">
                  <h3 className="font-bold mb-4 flex items-center">
                    <History className="mr-2 h-5 w-5 text-blue-600" />
                    最近动态
                  </h3>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground italic py-8 text-center border-t border-dashed">
                      暂无最近动态
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="chat" className="mt-0">
            <AIChat userId={user.id} />
          </TabsContent>

          <TabsContent value="mock" className="mt-0">
            <MockInterview userId={user.id} />
          </TabsContent>

          <TabsContent value="resume" className="mt-0">
            <ResumeManager userId={user.id} />
          </TabsContent>

          <TabsContent value="records" className="mt-0">
            <InterviewRecords userId={user.id} />
          </TabsContent>

          <TabsContent value="analysis" className="mt-0">
            <ReviewAnalysis userId={user.id} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
