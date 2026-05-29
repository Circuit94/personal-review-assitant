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
import { InterviewSprint } from '@/components/InterviewSprint'
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
  Zap,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface DashboardStats {
  resumeCount: number
  interviewCount: number
  mockCount: number
  audioCount: number
}

function getReadinessScore(stats: DashboardStats): number {
  let score = 0
  // 简历 (25分)
  if (stats.resumeCount > 0) score += 25
  // 模拟面试 (35分，每次+7，最多35)
  score += Math.min(stats.mockCount * 7, 35)
  // 面试记录 (20分，每条+5，最多20)
  score += Math.min(stats.interviewCount * 5, 20)
  // 录音分析 (20分，每条+10，最多20)
  score += Math.min(stats.audioCount * 10, 20)
  return Math.min(score, 100)
}

function getReadinessMessage(stats: DashboardStats): string {
  const score = getReadinessScore(stats)
  if (score === 0) return '开始你的面试准备之旅吧！上传简历是第一步。'
  if (score < 30) return '刚刚起步，建议先上传简历并完成一次模拟面试。'
  if (score < 60) return '准备进行中，继续模拟面试和记录复盘可以快速提升。'
  if (score < 85) return '准备得不错！保持练习频率，关注薄弱环节。'
  return '准备充分！你已经做了大量练习，自信地迎接面试吧！'
}

interface RecommendedAction {
  title: string
  description: string
  tab: string
  icon: React.ReactNode
  iconBg: string
  borderColor: string
}

function getRecommendedActions(stats: DashboardStats): RecommendedAction[] {
  const actions: RecommendedAction[] = []

  if (stats.resumeCount === 0) {
    actions.push({
      title: '上传简历',
      description: 'AI 将基于简历生成针对性面试题',
      tab: 'resume',
      icon: <FileText className="h-5 w-5 text-blue-600" />,
      iconBg: 'bg-blue-100',
      borderColor: 'border-l-blue-500',
    })
  }

  if (stats.mockCount < 3) {
    actions.push({
      title: '完成模拟面试',
      description: `已完成 ${stats.mockCount} 次，建议至少 3 次`,
      tab: 'mock',
      icon: <Play className="h-5 w-5 text-green-600" />,
      iconBg: 'bg-green-100',
      borderColor: 'border-l-green-500',
    })
  }

  if (stats.interviewCount === 0) {
    actions.push({
      title: '记录面试经历',
      description: '用看板追踪面试进度和复盘',
      tab: 'records',
      icon: <History className="h-5 w-5 text-purple-600" />,
      iconBg: 'bg-purple-100',
      borderColor: 'border-l-purple-500',
    })
  }

  // 如果基础都完成了，推荐进阶动作
  if (actions.length === 0) {
    actions.push(
      {
        title: '面试冲刺准备',
        description: '为即将到来的面试生成 30 分钟清单',
        tab: 'sprint',
        icon: <Zap className="h-5 w-5 text-amber-600" />,
        iconBg: 'bg-amber-100',
        borderColor: 'border-l-amber-500',
      },
      {
        title: '继续模拟面试',
        description: '保持手感，挑战更高难度',
        tab: 'mock',
        icon: <Brain className="h-5 w-5 text-green-600" />,
        iconBg: 'bg-green-100',
        borderColor: 'border-l-green-500',
      },
      {
        title: '生成复盘报告',
        description: '分析进步趋势和薄弱环节',
        tab: 'analysis',
        icon: <TrendingUp className="h-5 w-5 text-indigo-600" />,
        iconBg: 'bg-indigo-100',
        borderColor: 'border-l-indigo-500',
      },
    )
  }

  return actions.slice(0, 3)
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
      setStats({
        resumeCount: data.resumes,
        interviewCount: data.interviews,
        mockCount: data.chats,
        audioCount: data.audios,
      })
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
              <TabsTrigger value="sprint" className="data-[state=active]:bg-amber-50 data-[state=active]:text-amber-600 px-3 sm:px-6 text-xs sm:text-sm">
                <Zap className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">面试冲刺</span>
                <span className="sm:hidden">冲刺</span>
              </TabsTrigger>
              <TabsTrigger value="infobank" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 px-3 sm:px-6 text-xs sm:text-sm">
                <Database className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">信息库</span>
                <span className="sm:hidden">信息</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* 概览页 - 任务导向 */}
          <TabsContent value="overview" className="mt-0">
            <div className="space-y-6">
              {/* 面试准备度评分 */}
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-6 sm:p-8 rounded-2xl shadow-lg">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold mb-2">面试准备度</h2>
                    <p className="text-blue-100 text-sm">
                      {getReadinessMessage(stats)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-center">
                      <div className="text-4xl sm:text-5xl font-bold">{getReadinessScore(stats)}</div>
                      <div className="text-xs text-blue-200 mt-1">/ 100 分</div>
                    </div>
                  </div>
                </div>
                {/* 准备度进度条 */}
                <div className="mt-4 w-full h-2 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white/80 rounded-full transition-all duration-500"
                    style={{ width: `${getReadinessScore(stats)}%` }}
                  />
                </div>
              </div>

              {/* 推荐下一步动作 */}
              <div>
                <h3 className="text-lg font-bold mb-3">📋 推荐下一步</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {getRecommendedActions(stats).map((action, idx) => (
                    <Card
                      key={idx}
                      className={`cursor-pointer hover:shadow-md transition-all border-l-4 ${action.borderColor}`}
                      onClick={() => setActiveTab(action.tab)}
                    >
                      <CardContent className="py-4 flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${action.iconBg}`}>
                          {action.icon}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{action.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{action.description}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* 数据概览 */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('resume')}>
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">简历</p>
                        <p className="text-2xl font-bold">{stats.resumeCount}</p>
                      </div>
                      <Upload className="h-7 w-7 text-blue-500 opacity-50" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('mock')}>
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">模拟面试</p>
                        <p className="text-2xl font-bold">{stats.mockCount}</p>
                      </div>
                      <Brain className="h-7 w-7 text-green-500 opacity-50" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('records')}>
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">面试记录</p>
                        <p className="text-2xl font-bold">{stats.interviewCount}</p>
                      </div>
                      <History className="h-7 w-7 text-purple-500 opacity-50" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('audio')}>
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">录音分析</p>
                        <p className="text-2xl font-bold">{stats.audioCount}</p>
                      </div>
                      <Mic className="h-7 w-7 text-orange-500 opacity-50" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 快捷入口 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 bg-white dark:bg-gray-800 rounded-xl border shadow-sm hover:shadow-md transition-all cursor-pointer" onClick={() => setActiveTab('sprint')}>
                  <Zap className="h-7 w-7 text-amber-500 mb-3" />
                  <h3 className="font-bold">面试冲刺</h3>
                  <p className="text-xs text-muted-foreground mt-1">30 分钟快速准备，AI 定制清单</p>
                </div>
                <div className="p-5 bg-white dark:bg-gray-800 rounded-xl border shadow-sm hover:shadow-md transition-all cursor-pointer" onClick={() => setActiveTab('mock')}>
                  <Play className="h-7 w-7 text-green-500 mb-3" />
                  <h3 className="font-bold">模拟面试</h3>
                  <p className="text-xs text-muted-foreground mt-1">AI 面试官多轮追问，真实模拟</p>
                </div>
                <div className="p-5 bg-white dark:bg-gray-800 rounded-xl border shadow-sm hover:shadow-md transition-all cursor-pointer" onClick={() => setActiveTab('chat')}>
                  <MessageSquare className="h-7 w-7 text-blue-500 mb-3" />
                  <h3 className="font-bold">AI 辅导</h3>
                  <p className="text-xs text-muted-foreground mt-1">个性化面试辅导，基于你的简历</p>
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
          <TabsContent value="sprint" className="mt-0">
            <InterviewSprint userId={user!.id} />
          </TabsContent>
          <TabsContent value="infobank" className="mt-0">
            <PersonalInfoBank userId={user!.id} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
