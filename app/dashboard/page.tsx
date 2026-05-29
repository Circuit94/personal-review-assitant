'use client'

import { useEffect, useState } from 'react'
import { verifySession, signOut, api, User } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AIChat } from '@/components/AIChat'
import { MockInterview } from '@/components/MockInterview'
import { ResumeManager } from '@/components/ResumeManager'
import { InterviewRecords } from '@/components/InterviewRecords'
import { ReviewAnalysis } from '@/components/ReviewAnalysis'
import { AudioInterviewSystem } from '@/components/AudioInterviewSystem'
import { PersonalInfoBank } from '@/components/PersonalInfoBank'
import {
  LogOut,
  MessageSquare,
  Play,
  FileText,
  History,
  BarChart3,
  LayoutDashboard,
  Mic,
  Upload,
  Brain,
  TrendingUp,
  Database,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface DashboardStats {
  resumeCount: number
  interviewCount: number
  mockCount: number
  audioCount: number
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [stats, setStats] = useState<DashboardStats>({
    resumeCount: 0,
    interviewCount: 0,
    mockCount: 0,
    audioCount: 0,
  })
  const [isNewUser, setIsNewUser] = useState(false)

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    const user = await verifySession()
    if (!user) {
      window.location.href = '/'
      return
    }
    setUser(user)
    setLoading(false)
    await loadStats()
  }

  const loadStats = async () => {
    try {
      const data = await api.getStats()
      const newStats = {
        resumeCount: data.resumes,
        interviewCount: data.interviews,
        mockCount: data.chats,
        audioCount: data.audios,
      }
      setStats(newStats)
      setIsNewUser(Object.values(newStats).every((v) => v === 0))
    } catch (error) {
      console.error('Load stats error:', error)
    }
  }

  const handleSignOut = () => {
    signOut()
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          加载中...
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 顶部导航 */}
      <header className="bg-white dark:bg-gray-800 border-b px-4 sm:px-8 py-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
            <h1 className="text-lg sm:text-xl font-bold">面试助手</h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
              {user?.email}
            </span>
            <Button onClick={handleSignOut} variant="ghost" size="sm">
              <LogOut className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">退出</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 sm:p-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6 sm:space-y-8">
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <TabsList className="bg-white dark:bg-gray-800 border shadow-sm h-10 sm:h-12 p-1 inline-flex w-auto min-w-full sm:min-w-0">
              <TabsTrigger value="overview" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 px-3 sm:px-6 text-xs sm:text-sm">
                <LayoutDashboard className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">概览</span>
                <span className="sm:hidden">首页</span>
              </TabsTrigger>
              <TabsTrigger value="chat" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 px-3 sm:px-6 text-xs sm:text-sm">
                <MessageSquare className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">AI 聊天</span>
                <span className="sm:hidden">聊天</span>
              </TabsTrigger>
              <TabsTrigger value="mock" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 px-3 sm:px-6 text-xs sm:text-sm">
                <Play className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">模拟面试</span>
                <span className="sm:hidden">模拟</span>
              </TabsTrigger>
              <TabsTrigger value="resume" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 px-3 sm:px-6 text-xs sm:text-sm">
                <FileText className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">简历管理</span>
                <span className="sm:hidden">简历</span>
              </TabsTrigger>
              <TabsTrigger value="records" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 px-3 sm:px-6 text-xs sm:text-sm">
                <History className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">面试记录</span>
                <span className="sm:hidden">记录</span>
              </TabsTrigger>
              <TabsTrigger value="audio" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 px-3 sm:px-6 text-xs sm:text-sm">
                <Mic className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">录音分析</span>
                <span className="sm:hidden">录音</span>
              </TabsTrigger>
              <TabsTrigger value="analysis" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 px-3 sm:px-6 text-xs sm:text-sm">
                <BarChart3 className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">复盘分析</span>
                <span className="sm:hidden">复盘</span>
              </TabsTrigger>
              <TabsTrigger value="infobank" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 px-3 sm:px-6 text-xs sm:text-sm">
                <Database className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">信息库</span>
                <span className="sm:hidden">信息</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* 概览页 */}
          <TabsContent value="overview" className="mt-0">
            <div className="space-y-6">
              {isNewUser && (
                <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
                  <CardContent className="pt-6">
                    <h3 className="font-bold text-amber-800 mb-3">🎯 快速开始指南</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="flex items-start gap-3 p-3 bg-white/60 rounded-lg cursor-pointer hover:bg-white/80 transition-colors" onClick={() => setActiveTab('resume')}>
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm shrink-0">1</div>
                        <div>
                          <p className="text-sm font-medium">上传简历</p>
                          <p className="text-xs text-muted-foreground">AI 将基于简历生成针对性题目</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 bg-white/60 rounded-lg cursor-pointer hover:bg-white/80 transition-colors" onClick={() => setActiveTab('mock')}>
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold text-sm shrink-0">2</div>
                        <div>
                          <p className="text-sm font-medium">模拟面试</p>
                          <p className="text-xs text-muted-foreground">AI 面试官实时提问和反馈</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 bg-white/60 rounded-lg cursor-pointer hover:bg-white/80 transition-colors" onClick={() => setActiveTab('analysis')}>
                        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-sm shrink-0">3</div>
                        <div>
                          <p className="text-sm font-medium">复盘分析</p>
                          <p className="text-xs text-muted-foreground">生成周度报告追踪进步</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('resume')}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">简历数</p>
                        <p className="text-2xl font-bold">{stats.resumeCount}</p>
                      </div>
                      <Upload className="h-8 w-8 text-blue-500 opacity-50" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('mock')}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">模拟面试</p>
                        <p className="text-2xl font-bold">{stats.mockCount}</p>
                      </div>
                      <Brain className="h-8 w-8 text-green-500 opacity-50" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('records')}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">面试记录</p>
                        <p className="text-2xl font-bold">{stats.interviewCount}</p>
                      </div>
                      <History className="h-8 w-8 text-purple-500 opacity-50" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('audio')}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">录音分析</p>
                        <p className="text-2xl font-bold">{stats.audioCount}</p>
                      </div>
                      <Mic className="h-8 w-8 text-orange-500 opacity-50" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-6 sm:p-8 rounded-2xl shadow-lg">
                    <h2 className="text-xl sm:text-3xl font-bold mb-3 sm:mb-4">欢迎回来，准备好迎接下一次面试了吗？</h2>
                    <p className="text-blue-100 mb-4 sm:mb-6 text-sm sm:text-lg">面试助手帮助您优化简历、模拟面试场景，并提供深度复盘分析。</p>
                    <div className="flex flex-wrap gap-3">
                      <Button variant="secondary" onClick={() => setActiveTab('mock')} className="h-10 sm:h-11 px-4 sm:px-8 font-semibold">
                        <Play className="mr-2 h-4 w-4" />开始模拟面试
                      </Button>
                      <Button variant="outline" onClick={() => setActiveTab('chat')} className="h-10 sm:h-11 px-4 sm:px-8 font-semibold bg-white/10 border-white/30 text-white hover:bg-white/20">
                        <MessageSquare className="mr-2 h-4 w-4" />AI 辅导
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-5 sm:p-6 bg-white dark:bg-gray-800 rounded-xl border shadow-sm hover:shadow-md transition-all cursor-pointer" onClick={() => setActiveTab('audio')}>
                      <Mic className="h-7 w-7 sm:h-8 sm:w-8 text-orange-500 mb-3 sm:mb-4" />
                      <h3 className="font-bold text-base sm:text-lg">录音智能分析</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-2">上传面试录音，AI 自动转写并多维度分析表现。</p>
                    </div>
                    <div className="p-5 sm:p-6 bg-white dark:bg-gray-800 rounded-xl border shadow-sm hover:shadow-md transition-all cursor-pointer" onClick={() => setActiveTab('analysis')}>
                      <TrendingUp className="h-7 w-7 sm:h-8 sm:w-8 text-green-500 mb-3 sm:mb-4" />
                      <h3 className="font-bold text-base sm:text-lg">智能复盘</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-2">基于历史记录，智能生成周度复盘报告和提升建议。</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <Card>
                    <CardContent className="pt-6">
                      <h3 className="font-bold mb-4 flex items-center text-sm">
                        <TrendingUp className="mr-2 h-4 w-4 text-blue-600" />使用建议
                      </h3>
                      <div className="space-y-3 text-xs text-muted-foreground">
                        {stats.resumeCount === 0 && (
                          <div className="flex items-start gap-2 p-2 bg-amber-50 rounded-lg">
                            <span className="text-amber-500">💡</span>
                            <p>上传简历可以让 AI 生成更有针对性的面试题目</p>
                          </div>
                        )}
                        {stats.mockCount < 3 && (
                          <div className="flex items-start gap-2 p-2 bg-blue-50 rounded-lg">
                            <span className="text-blue-500">🎯</span>
                            <p>建议每周至少完成 3 次模拟面试以保持状态</p>
                          </div>
                        )}
                        {stats.audioCount === 0 && (
                          <div className="flex items-start gap-2 p-2 bg-green-50 rounded-lg">
                            <span className="text-green-500">🎙️</span>
                            <p>上传真实面试录音可以获得最精准的复盘分析</p>
                          </div>
                        )}
                        {stats.resumeCount > 0 && stats.mockCount >= 3 && (
                          <div className="flex items-start gap-2 p-2 bg-purple-50 rounded-lg">
                            <span className="text-purple-500">🏆</span>
                            <p>你的准备很充分！试试生成复盘报告看看进步趋势</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="chat" className="mt-0">
            <AIChat userId={user!.id} />
          </TabsContent>
          <TabsContent value="mock" className="mt-0">
            <MockInterview userId={user!.id} />
          </TabsContent>
          <TabsContent value="resume" className="mt-0">
            <ResumeManager userId={user!.id} />
          </TabsContent>
          <TabsContent value="records" className="mt-0">
            <InterviewRecords userId={user!.id} />
          </TabsContent>
          <TabsContent value="audio" className="mt-0">
            <AudioInterviewSystem userId={user!.id} />
          </TabsContent>
          <TabsContent value="analysis" className="mt-0">
            <ReviewAnalysis userId={user!.id} />
          </TabsContent>
          <TabsContent value="infobank" className="mt-0">
            <PersonalInfoBank userId={user!.id} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
