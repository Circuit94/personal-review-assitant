'use client'

import { useState, useEffect } from 'react'
import { api, getToken } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { BarChart, Brain, Calendar, CheckCircle2, ListTodo, TrendingUp, Target, Star, AlertTriangle, ArrowUp, ArrowDown, Minus } from 'lucide-react'

interface MetricsDimension {
  name: string
  score: number
}

interface WeakPoint {
  name: string
  score: number
}

interface AnalysisMetrics {
  overall_score: number
  dimensions: MetricsDimension[]
  star_usage_rate: number
  weak_points: WeakPoint[]
  improvement_trend: number
}

interface AnalysisRecord {
  id: string
  analysis_type: string
  period_start: string
  period_end: string
  summary: string
  strengths: string[]
  weaknesses: string[]
  suggestions: string[]
  metrics: AnalysisMetrics | null
  created_at: string
}

function ScoreRing({ score, size = 80, label }: { score: number; size?: number; label?: string }) {
  const radius = (size - 8) / 2
  const circumference = 2 * Math.PI * radius
  const progress = (score / 100) * circumference
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444'

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          className="text-muted/20"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute flex items-center justify-center" style={{ width: size, height: size }}>
        <span className="text-lg font-bold">{score}</span>
      </div>
      {label && <span className="text-xs text-muted-foreground">{label}</span>}
    </div>
  )
}

function DimensionBar({ name, score }: { name: string; score: number }) {
  const color = score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span>{name}</span>
        <span className="font-medium">{score}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  )
}

function TrendIndicator({ value }: { value: number }) {
  if (value > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-green-600 text-sm font-medium">
        <ArrowUp className="h-3.5 w-3.5" />+{value}
      </span>
    )
  } else if (value < 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-red-600 text-sm font-medium">
        <ArrowDown className="h-3.5 w-3.5" />{value}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-muted-foreground text-sm">
      <Minus className="h-3.5 w-3.5" />持平
    </span>
  )
}

function MetricsPanel({ metrics, allMetrics }: { metrics: AnalysisMetrics; allMetrics: AnalysisMetrics[] }) {
  return (
    <div className="space-y-6">
      {/* 综合分数 + STAR使用率 + 趋势 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center space-y-2">
          <div className="relative inline-flex items-center justify-center">
            <ScoreRing score={metrics.overall_score} size={72} />
          </div>
          <p className="text-xs text-muted-foreground">综合评分</p>
        </div>
        <div className="text-center space-y-2">
          <div className="relative inline-flex items-center justify-center">
            <ScoreRing score={metrics.star_usage_rate} size={72} />
          </div>
          <p className="text-xs text-muted-foreground">STAR 使用率</p>
        </div>
        <div className="flex flex-col items-center justify-center space-y-1">
          <TrendIndicator value={metrics.improvement_trend} />
          <p className="text-xs text-muted-foreground">进步趋势</p>
        </div>
      </div>

      {/* 多维度评分 */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold flex items-center gap-1.5">
          <Target className="h-4 w-4 text-blue-500" />
          能力维度
        </h4>
        <div className="grid grid-cols-1 gap-2">
          {metrics.dimensions.map((dim) => (
            <DimensionBar key={dim.name} name={dim.name} score={dim.score} />
          ))}
        </div>
      </div>

      {/* 薄弱知识点 */}
      {metrics.weak_points && metrics.weak_points.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            薄弱知识点
          </h4>
          <div className="space-y-2">
            {metrics.weak_points.map((wp) => (
              <div key={wp.name} className="flex items-center justify-between p-2 bg-amber-50 dark:bg-amber-950/20 rounded-md">
                <span className="text-sm">{wp.name}</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  wp.score >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                }`}>
                  掌握度 {wp.score}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 历史分数趋势（如果有多次分析） */}
      {allMetrics.length > 1 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-green-500" />
            分数趋势
          </h4>
          <div className="flex items-end gap-1 h-16">
            {allMetrics.slice(0, 10).reverse().map((m, idx) => {
              const height = (m.overall_score / 100) * 100
              const isLatest = idx === allMetrics.slice(0, 10).length - 1
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-0.5">
                  <span className="text-[10px] text-muted-foreground">{m.overall_score}</span>
                  <div
                    className={`w-full rounded-t transition-all ${isLatest ? 'bg-blue-500' : 'bg-blue-200 dark:bg-blue-800'}`}
                    style={{ height: `${height}%` }}
                  />
                </div>
              )
            })}
          </div>
          <p className="text-[10px] text-muted-foreground text-center">← 早期 · · · 最近 →</p>
        </div>
      )}
    </div>
  )
}

export function ReviewAnalysis({ userId }: { userId: string }) {
  const [analyses, setAnalyses] = useState<AnalysisRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchAnalyses()
  }, [])

  const fetchAnalyses = async () => {
    try {
      setLoading(true)
      const data = await api.getReviewAnalyses()
      setAnalyses((data || []) as unknown as AnalysisRecord[])
    } catch (error: any) {
      console.error('获取复盘分析失败:', error)
      toast({
        title: '获取复盘分析失败',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateAnalysis = async () => {
    setGenerating(true)
    try {
      // 1. 获取面试记录
      const interviewRecordsRaw = await api.getInterviewRecords()
      const interviewRecords = (interviewRecordsRaw || []).slice(0, 10)

      // 2. 获取新版模拟面试记录（带反馈和评分）
      const mockInterviewRecordsRaw = await api.getMockInterviewRecords()
      const mockInterviewRecords = (mockInterviewRecordsRaw || []).slice(0, 10)

      // 3. 获取旧版模拟面试数据（向后兼容）
      const mockSessionsRaw = await api.getChatSessions('mock_interview')
      const mockSessions = mockSessionsRaw || []

      let allMockQuestions: any[] = []
      for (const session of mockSessions) {
        try {
          const questions = await api.getMockQuestions(session.id as string)
          if (questions && questions.length > 0) {
            allMockQuestions = allMockQuestions.concat(questions)
          }
        } catch {
          // 单个 session 获取失败不中断整体流程
        }
      }
      allMockQuestions = allMockQuestions.slice(0, 20)

      if (interviewRecords.length === 0 && allMockQuestions.length === 0 && mockInterviewRecords.length === 0) {
        toast({ title: '数据不足', description: '暂无面试记录或模拟面试数据，请先记录面试或开始模拟面试。' })
        setGenerating(false)
        return
      }

      // 4. 调用 API 生成分析报告（传入新版模拟面试数据）
      const token = getToken()
      const response = await fetch('/api/generate-review-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          interviewRecords,
          mockQuestions: allMockQuestions,
          mockInterviewRecords,
        }),
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.error || '生成分析报告失败')
      }
      const data = await response.json()

      // 5. 保存分析报告（含量化指标）
      await api.createReviewAnalysis({
        user_id: userId,
        analysis_type: 'weekly',
        period_start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        period_end: new Date().toISOString().split('T')[0],
        summary: data.summary,
        strengths: data.strengths,
        weaknesses: data.weaknesses,
        suggestions: data.suggestions,
        metrics: data.metrics || null,
      })

      toast({ title: '分析报告已生成' })
      fetchAnalyses()
    } catch (error: any) {
      console.error('生成报告失败:', error)
      toast({
        title: '生成报告失败',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setGenerating(false)
    }
  }

  // 收集所有有 metrics 的分析记录
  const allMetrics = analyses
    .filter((a) => a.metrics)
    .map((a) => a.metrics!)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">复盘分析</h2>
        <Button onClick={handleGenerateAnalysis} disabled={generating}>
          {generating ? '正在分析...' : '生成周度复盘'}
        </Button>
      </div>

      <div className="space-y-6">
        {analyses.map((analysis) => (
          <Card key={analysis.id}>
            <CardHeader className="bg-muted/50">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg flex items-center">
                  <Calendar className="mr-2 h-5 w-5" />
                  复盘报告 ({analysis.period_start} ~ {analysis.period_end})
                </CardTitle>
                <div className="flex items-center gap-3">
                  {analysis.metrics && (
                    <span className="text-sm font-bold text-blue-600">
                      {analysis.metrics.overall_score} 分
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {new Date(analysis.created_at).toLocaleString()}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 左侧：定性分析 */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 font-bold text-blue-600">
                      <TrendingUp className="h-5 w-5" />
                      总体评价
                    </div>
                    <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                      {analysis.summary}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 font-bold text-green-600">
                        <CheckCircle2 className="h-5 w-5" />
                        核心优势
                      </div>
                      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                        {analysis.strengths?.map((s: string, idx: number) => (
                          <li key={idx}>{s}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 font-bold text-amber-600">
                        <Brain className="h-5 w-5" />
                        待提升项
                      </div>
                      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                        {analysis.weaknesses?.map((w: string, idx: number) => (
                          <li key={idx}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 font-bold text-blue-600">
                      <ListTodo className="h-5 w-5" />
                      提升建议
                    </div>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                      {analysis.suggestions?.map((s: string, idx: number) => (
                        <li key={idx}>{s}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* 右侧：量化指标 */}
                {analysis.metrics && (
                  <div className="lg:border-l lg:pl-6">
                    <MetricsPanel metrics={analysis.metrics} allMetrics={allMetrics} />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {analyses.length === 0 && !loading && (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <BarChart className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-muted-foreground">暂无分析报告，记录更多面试经历以生成复盘报告</p>
          </div>
        )}
      </div>
    </div>
  )
}
