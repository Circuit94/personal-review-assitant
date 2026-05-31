'use client'

import { useState, useEffect, useCallback } from 'react'
import { api, getToken } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import {
  Zap,
  Loader2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  MessageCircleQuestion,
  Lightbulb,
  Building2,
  History,
  Trash2,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { SprintData, SprintRecord } from '@/lib/types'

export function InterviewSprint({ userId }: { userId: string }) {
  const [company, setCompany] = useState('')
  const [position, setPosition] = useState('')
  const [loading, setLoading] = useState(false)
  const [sprintData, setSprintData] = useState<SprintData | null>(null)
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set())
  const [historyRecords, setHistoryRecords] = useState<SprintRecord[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [showHistory, setShowHistory] = useState(false)
  const { toast } = useToast()

  void userId

  const fetchHistory = useCallback(async () => {
    try {
      const data = await api.getSprintRecords()
      setHistoryRecords((data as unknown as SprintRecord[]) || [])
    } catch (error) {
      console.error('获取冲刺历史失败:', error)
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  const handleGenerate = async () => {
    if (!company.trim() && !position.trim()) {
      toast({ title: '请至少填写公司或岗位', variant: 'destructive' })
      return
    }
    setLoading(true)
    setSprintData(null)
    setCheckedItems(new Set())

    try {
      // 获取简历
      const resumeData = (await api.getResumes()) as Record<string, unknown>[]
      const resumeText = (resumeData?.[0]?.extracted_text as string) || ''

      const token = getToken()
      const response = await fetch('/api/interview-sprint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ company, position, resumeText }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.error || '生成失败')
      }

      const data = await response.json()
      setSprintData(data)

      // 自动保存到历史记录
      try {
        await api.createSprintRecord({
          company: company.trim(),
          position: position.trim(),
          sprint_data: data,
        })
        fetchHistory() // 刷新历史列表
      } catch (saveErr) {
        console.error('保存冲刺记录失败:', saveErr)
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '生成准备清单失败'
      toast({ title: '生成失败', description: message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleLoadHistory = (record: SprintRecord) => {
    setSprintData(record.sprint_data)
    setCompany(record.company || '')
    setPosition(record.position || '')
    setCheckedItems(new Set())
    setShowHistory(false)
  }

  const handleDeleteHistory = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await api.deleteSprintRecord(id)
      setHistoryRecords((prev) => prev.filter((r) => r.id !== id))
      toast({ title: '已删除' })
    } catch {
      toast({ title: '删除失败', variant: 'destructive' })
    }
  }

  const toggleCheck = (key: string) => {
    setCheckedItems((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // 历史记录面板
  const renderHistoryPanel = () => (
    <Card className="h-[500px] flex flex-col">
      <CardHeader className="py-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <History className="h-4 w-4 text-amber-500" />
          历史冲刺记录 ({historyRecords.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex-1 overflow-hidden">
        <ScrollArea className="h-full px-4 pb-4">
          {historyLoading ? (
            <div className="text-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : historyRecords.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm italic">暂无历史记录</p>
            </div>
          ) : (
            <div className="space-y-3">
              {historyRecords.map((record) => (
                <div
                  key={record.id}
                  onClick={() => handleLoadHistory(record)}
                  className="p-3 border rounded-lg cursor-pointer hover:border-amber-400 hover:bg-amber-50/50 transition-all group"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {[record.company, record.position].filter(Boolean).join(' · ') || '未命名'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(record.created_at).toLocaleString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 h-7 w-7 p-0 shrink-0"
                      onClick={(e) => handleDeleteHistory(record.id, e)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )

  // 未生成状态
  if (!sprintData && !loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        <div className="lg:col-span-2 flex flex-col items-center justify-center min-h-[500px] space-y-8">
          <div className="relative">
            <div className="absolute inset-0 bg-amber-500/20 rounded-full blur-xl animate-pulse" />
            <Zap className="relative h-20 w-20 text-amber-500" />
          </div>

          <div className="text-center max-w-lg">
            <h2 className="text-3xl font-bold tracking-tight">面试冲刺</h2>
            <p className="text-muted-foreground mt-3 text-lg">
              30 分钟快速准备 · AI 定制清单
            </p>
            <p className="text-muted-foreground mt-2 text-sm">
              输入目标公司和岗位，AI 会为你生成一份针对性的 30 分钟面试准备清单
            </p>
          </div>

          <div className="w-full max-w-md space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder="目标公司"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="h-11"
              />
              <Input
                placeholder="目标岗位"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                className="h-11"
              />
            </div>
            <Button
              className="w-full h-12 text-lg"
              onClick={handleGenerate}
              disabled={!company.trim() && !position.trim()}
            >
              <Zap className="mr-2 h-5 w-5" />
              生成冲刺清单
            </Button>
          </div>
        </div>

        {/* 右侧历史记录 */}
        <div className="lg:col-span-1">
          {renderHistoryPanel()}
        </div>
      </div>
    )
  }

  // 加载中
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-amber-500" />
        <p className="text-lg font-medium">正在生成你的面试冲刺清单...</p>
        <p className="text-sm text-muted-foreground">AI 正在分析公司和岗位信息</p>
      </div>
    )
  }

  // 如果返回的是原始文本（JSON 解析失败）
  if (sprintData?.raw) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <Button variant="outline" onClick={() => setSprintData(null)}>
          ← 重新生成
        </Button>
        <Card>
          <CardContent className="py-4">
            <pre className="text-sm whitespace-pre-wrap">{sprintData.raw}</pre>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 展示冲刺清单
  const totalChecks = sprintData!.tasks.reduce((sum, t) => sum + t.checklist.length, 0)
  const completedChecks = checkedItems.size
  const progress = totalChecks > 0 ? Math.round((completedChecks / totalChecks) * 100) : 0

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
      {/* 主内容区 */}
      <div className="lg:col-span-3 space-y-6">
        {/* 头部 */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Zap className="h-6 w-6 text-amber-500" />
              面试冲刺清单
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {company && <span className="font-medium">{company}</span>}
              {company && position && ' · '}
              {position && <span className="font-medium">{position}</span>}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium">{progress}% 完成</p>
              <p className="text-xs text-muted-foreground">{completedChecks}/{totalChecks} 项</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => { setSprintData(null); setCheckedItems(new Set()) }}>
              重新生成
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
              className="lg:hidden"
            >
              <History className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* 进度条 */}
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-500 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* 公司简介 */}
        {sprintData!.company_brief && (
          <Card className="border-blue-200 bg-blue-50/50">
            <CardContent className="py-3 flex items-start gap-3">
              <Building2 className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-sm text-blue-800">{sprintData!.company_brief}</p>
            </CardContent>
          </Card>
        )}

        {/* 时间任务卡片 */}
        <div className="space-y-4">
          {sprintData!.tasks.map((task, idx) => (
            <Card key={idx} className="overflow-hidden">
              <CardHeader className="py-3 bg-gray-50 dark:bg-gray-900 border-b">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="font-mono text-xs shrink-0">
                    <Clock className="h-3 w-3 mr-1" />
                    {task.time}
                  </Badge>
                  <CardTitle className="text-base">{task.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="py-3 space-y-3">
                <p className="text-sm text-muted-foreground">{task.description}</p>
                <div className="space-y-2">
                  {task.checklist.map((item, cIdx) => {
                    const key = `${idx}-${cIdx}`
                    const isChecked = checkedItems.has(key)
                    return (
                      <label
                        key={cIdx}
                        className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer transition-colors ${
                          isChecked ? 'bg-green-50 dark:bg-green-950/20' : 'hover:bg-gray-50 dark:hover:bg-gray-900'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleCheck(key)}
                          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                        />
                        <span className={`text-sm ${isChecked ? 'line-through text-muted-foreground' : ''}`}>
                          {item}
                        </span>
                      </label>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 底部参考信息 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 高频问题 */}
          {sprintData!.key_questions?.length > 0 && (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MessageCircleQuestion className="h-4 w-4 text-blue-500" />
                  可能被问到的问题
                </CardTitle>
              </CardHeader>
              <CardContent className="py-2 space-y-2">
                {sprintData!.key_questions.map((q, idx) => (
                  <p key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-blue-500 shrink-0">•</span>
                    {q}
                  </p>
                ))}
              </CardContent>
            </Card>
          )}

          {/* 亮点话术 */}
          {sprintData!.talking_points?.length > 0 && (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-amber-500" />
                  主动提到的亮点
                </CardTitle>
              </CardHeader>
              <CardContent className="py-2 space-y-2">
                {sprintData!.talking_points.map((p, idx) => (
                  <p key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-amber-500 shrink-0">•</span>
                    {p}
                  </p>
                ))}
              </CardContent>
            </Card>
          )}

          {/* 雷区 */}
          {sprintData!.red_flags?.length > 0 && (
            <Card className="border-red-100">
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  注意避免
                </CardTitle>
              </CardHeader>
              <CardContent className="py-2 space-y-2">
                {sprintData!.red_flags.map((f, idx) => (
                  <p key={idx} className="text-sm text-red-600 flex items-start gap-2">
                    <span className="shrink-0">⚠️</span>
                    {f}
                  </p>
                ))}
              </CardContent>
            </Card>
          )}

          {/* 反问 */}
          {sprintData!.reverse_questions?.length > 0 && (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  反问面试官
                </CardTitle>
              </CardHeader>
              <CardContent className="py-2 space-y-2">
                {sprintData!.reverse_questions.map((q, idx) => (
                  <p key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-green-500 shrink-0">•</span>
                    {q}
                  </p>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* 右侧历史记录（桌面端常驻） */}
      <div className={`lg:col-span-1 ${showHistory ? '' : 'hidden lg:block'}`}>
        {renderHistoryPanel()}
      </div>
    </div>
  )
}
