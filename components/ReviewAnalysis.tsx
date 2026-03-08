'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { BarChart, Brain, Calendar, CheckCircle2, ListTodo, TrendingUp } from 'lucide-react'

export function ReviewAnalysis({ userId }: { userId: string }) {
  const [analyses, setAnalyses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchAnalyses()
  }, [])

  const fetchAnalyses = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('review_analyses')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setAnalyses(data || [])
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
      // 1. 获取最近的面试记录和模拟面试记录
      const { data: interviewRecords } = await supabase
        .from('interview_records')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10)

      const { data: mockQuestions } = await supabase
        .from('mock_interview_questions')
        .select(`
          question,
          user_answer,
          ai_feedback,
          chat_sessions!inner(user_id)
        `)
        .eq('chat_sessions.user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20)

      if ((!interviewRecords || interviewRecords.length === 0) && (!mockQuestions || mockQuestions.length === 0)) {
        throw new Error('暂无足够的面试记录或模拟面试数据来进行分析，请先记录面试或开始模拟面试。')
      }

      // 2. 调用 API 生成分析报告
      const response = await fetch('/api/generate-review-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interviewRecords, mockQuestions }),
      })

      if (!response.ok) throw new Error('生成分析报告失败')
      const data = await response.json()

      // 3. 保存分析报告到数据库
      const { error: dbError } = await supabase.from('review_analyses').insert({
        user_id: userId,
        analysis_type: 'weekly',
        period_start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        period_end: new Date().toISOString().split('T')[0],
        summary: data.summary,
        strengths: data.strengths,
        weaknesses: data.weaknesses,
        suggestions: data.suggestions,
      })

      if (dbError) throw dbError

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
                <span className="text-xs text-muted-foreground">
                  生成时间: {new Date(analysis.created_at).toLocaleString()}
                </span>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 font-bold text-blue-600">
                    <TrendingUp className="h-5 w-5" />
                    总体评价
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                    {analysis.summary}
                  </p>
                </div>

                <div className="space-y-6">
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
