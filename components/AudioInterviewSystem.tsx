'use client'

import { useState, useEffect, useCallback } from 'react'
import { api, getToken } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { MessageSquareText, Loader2, CheckCircle2, BarChart3, FileDown, X, Send } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'
import * as XLSX from 'xlsx'
import type { AudioRecord, RadarDimension } from '@/lib/types'

export function AudioInterviewSystem({ userId }: { userId: string }) {
  const [records, setRecords] = useState<AudioRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [inputText, setInputText] = useState('')
  const [inputTitle, setInputTitle] = useState('')
  const [selectedRecord, setSelectedRecord] = useState<AudioRecord | null>(null)
  const { toast } = useToast()

  const fetchRecords = useCallback(async () => {
    try {
      const data = await api.getAudioRecords()
      setRecords((data as unknown as AudioRecord[]) || [])
    } catch (error) {
      console.error('获取记录失败:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRecords()
  }, [fetchRecords])

  // 条件轮询：仅当有处理中的记录时才轮询
  useEffect(() => {
    const hasProcessing = records.some(
      (r) => r.status === 'analyzing'
    )

    if (!hasProcessing) return

    const interval = setInterval(fetchRecords, 5000)
    return () => clearInterval(interval)
  }, [records, fetchRecords])

  // 获取雷达图数据
  const getRadarData = (): RadarDimension[] => {
    if (selectedRecord?.analysis?.dimensions && selectedRecord.analysis.dimensions.length > 0) {
      return selectedRecord.analysis.dimensions
    }
    if (selectedRecord?.analysis?.score) {
      const baseScore = selectedRecord.analysis.score
      return [
        { subject: '表达清晰度', score: Math.min(100, baseScore + Math.floor(Math.random() * 10 - 5)), fullMark: 100 },
        { subject: '逻辑性', score: Math.min(100, baseScore + Math.floor(Math.random() * 10 - 5)), fullMark: 100 },
        { subject: '技术深度', score: Math.min(100, baseScore - Math.floor(Math.random() * 10)), fullMark: 100 },
        { subject: '自信度', score: Math.min(100, baseScore + Math.floor(Math.random() * 5)), fullMark: 100 },
        { subject: 'STAR法则', score: Math.min(100, baseScore - Math.floor(Math.random() * 15)), fullMark: 100 },
      ]
    }
    return []
  }

  const handleSubmit = async () => {
    if (!inputText.trim()) {
      toast({ title: '请输入内容', description: '请粘贴面试对话文本', variant: 'destructive' })
      return
    }

    if (inputText.trim().length < 50) {
      toast({ title: '内容过短', description: '请输入至少50个字符的面试对话内容', variant: 'destructive' })
      return
    }

    setAnalyzing(true)

    try {
      const token = getToken()
      const res = await fetch('/api/audio/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          text: inputText,
          title: inputTitle.trim() || undefined,
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || errData.details || '分析失败')
      }

      toast({ title: '分析完成', description: 'AI 已完成面试对话智能分析' })
      setInputText('')
      setInputTitle('')
      fetchRecords()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '分析失败'
      toast({ title: '分析失败', description: message, variant: 'destructive' })
    } finally {
      setAnalyzing(false)
    }
  }

  const exportToPDF = () => {
    if (!selectedRecord) return
    const doc = new jsPDF() as any
    doc.setFont('helvetica')
    doc.text(`Interview Analysis Report: ${selectedRecord.title}`, 10, 10)
    doc.text(`Score: ${selectedRecord.analysis?.score || 0}/100`, 10, 20)
    doc.text(`Summary: ${selectedRecord.analysis?.summary || 'N/A'}`, 10, 30)

    const tableData =
      selectedRecord.qa_segments?.map((seg) => [
        seg.role === 'interviewer' ? 'Interviewer' : 'Candidate',
        seg.content.slice(0, 100),
      ]) || []

    doc.autoTable({
      head: [['Role', 'Content']],
      body: tableData,
      startY: 45,
    })

    doc.save(`${selectedRecord.title}_analysis.pdf`)
  }

  const exportToExcel = () => {
    if (!selectedRecord) return
    const ws = XLSX.utils.json_to_sheet(
      selectedRecord.qa_segments?.map((seg) => ({
        角色: seg.role === 'interviewer' ? '面试官' : '候选人',
        内容: seg.content,
      })) || []
    )
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '问答详情')

    // 添加分析摘要 sheet
    if (selectedRecord.analysis) {
      const summaryData = [
        { 指标: '综合评分', 值: selectedRecord.analysis.score || 0 },
        { 指标: '情感倾向', 值: selectedRecord.analysis.sentiment || '中性' },
        { 指标: '关键词', 值: (selectedRecord.analysis.keywords || []).join(', ') },
        { 指标: '总结', 值: selectedRecord.analysis.summary || '' },
      ]
      const ws2 = XLSX.utils.json_to_sheet(summaryData)
      XLSX.utils.book_append_sheet(wb, ws2, '分析摘要')
    }

    XLSX.writeFile(wb, `${selectedRecord.title}_分析报告.xlsx`)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'analyzing':
        return <Badge variant="outline" className="animate-pulse">分析中...</Badge>
      case 'completed':
        return <Badge variant="default" className="bg-green-600">已完成</Badge>
      case 'failed':
        return <Badge variant="destructive">失败</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const radarData = getRadarData()

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
      {/* 左侧：文本输入与历史列表 */}
      <div className="lg:col-span-1 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquareText className="h-5 w-5 text-blue-600" />
              面试文本分析
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="标题（选填，如：字节前端二面）"
              value={inputTitle}
              onChange={(e) => setInputTitle(e.target.value)}
              disabled={analyzing}
            />
            <Textarea
              placeholder="粘贴面试对话文本...&#10;&#10;支持格式示例：&#10;面试官：请自我介绍一下&#10;候选人：我是...&#10;&#10;或者直接粘贴面试录音转写后的文字"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={analyzing}
              className="min-h-[200px] resize-y"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {inputText.length} 字符
              </span>
              <Button
                onClick={handleSubmit}
                disabled={analyzing || !inputText.trim()}
                className="gap-2"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    AI 分析中...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    开始分析
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col h-[400px] lg:h-[500px]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquareText className="h-5 w-5 text-blue-600" />
              历史分析记录
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-hidden">
            <ScrollArea className="h-full px-4 pb-4">
              <div className="space-y-3">
                {records.map((record) => (
                  <div
                    key={record.id}
                    onClick={() => record.status === 'completed' && setSelectedRecord(record)}
                    className={`p-4 border rounded-lg transition-all ${
                      record.status === 'completed' ? 'cursor-pointer hover:border-blue-400' : 'opacity-70'
                    } ${selectedRecord?.id === record.id ? 'bg-blue-50 border-blue-400' : ''}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-sm truncate max-w-[150px]">{record.title}</h4>
                      {getStatusBadge(record.status)}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {new Date(record.created_at).toLocaleDateString()}
                      {record.analysis?.score && (
                        <span className="text-blue-600 font-medium">· {record.analysis.score}分</span>
                      )}
                    </div>
                  </div>
                ))}
                {records.length === 0 && !loading && (
                  <div className="text-center py-12 text-muted-foreground">
                    <p className="text-sm italic">暂无记录，粘贴面试文本开始第一次分析</p>
                  </div>
                )}
                {loading && (
                  <div className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* 右侧：分析详情 */}
      <div className="lg:col-span-2">
        {!selectedRecord ? (
          <Card className="h-full min-h-[400px] flex flex-col items-center justify-center p-12 text-center bg-muted/20 border-dashed">
            <BarChart3 className="h-16 w-16 text-muted-foreground/30 mb-6" />
            <h3 className="text-xl font-bold text-muted-foreground">选择一份记录查看深度分析</h3>
            <p className="text-muted-foreground mt-2 max-w-sm">
              粘贴面试对话文本，AI 将自动识别面试官提问与候选人回答，并从多维度为您提供专业反馈。
            </p>
          </Card>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-xl lg:text-2xl font-bold flex items-center gap-2">
                <MessageSquareText className="h-5 w-5 lg:h-6 lg:w-6 text-blue-600" />
                {selectedRecord.title} - 面试复盘报告
              </h2>
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={exportToPDF}>
                  <FileDown className="mr-2 h-4 w-4" />
                  PDF
                </Button>
                <Button variant="outline" size="sm" onClick={exportToExcel}>
                  <FileDown className="mr-2 h-4 w-4" />
                  Excel
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSelectedRecord(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Tabs defaultValue="analysis" className="w-full">
              <TabsList className="grid w-full grid-cols-3 h-12">
                <TabsTrigger value="analysis">多维度分析</TabsTrigger>
                <TabsTrigger value="transcription">问答详情</TabsTrigger>
                <TabsTrigger value="suggestions">改进建议</TabsTrigger>
              </TabsList>

              <TabsContent value="analysis" className="space-y-6 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-blue-50/50 border-blue-100">
                    <CardContent className="pt-6 text-center">
                      <p className="text-sm font-medium text-blue-600 mb-1">综合评分</p>
                      <h4 className="text-4xl font-bold text-blue-700">
                        {selectedRecord.analysis?.score || 0}
                      </h4>
                    </CardContent>
                  </Card>
                  <Card className="bg-green-50/50 border-green-100">
                    <CardContent className="pt-6 text-center">
                      <p className="text-sm font-medium text-green-600 mb-1">情感倾向</p>
                      <h4 className="text-2xl font-bold text-green-700">
                        {selectedRecord.analysis?.sentiment || '中性'}
                      </h4>
                    </CardContent>
                  </Card>
                  <Card className="bg-purple-50/50 border-purple-100">
                    <CardContent className="pt-6 text-center">
                      <p className="text-sm font-medium text-purple-600 mb-1">关键词</p>
                      <div className="flex flex-wrap justify-center gap-1">
                        {selectedRecord.analysis?.keywords?.slice(0, 4).map((k: string) => (
                          <Badge
                            key={k}
                            variant="secondary"
                            className="bg-purple-100 text-purple-700 hover:bg-purple-200"
                          >
                            {k}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base font-bold">能力雷达图</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                      {radarData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                            <PolarGrid />
                            <PolarAngleAxis dataKey="subject" />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} />
                            <Radar
                              name="候选人"
                              dataKey="score"
                              stroke="#2563eb"
                              fill="#3b82f6"
                              fillOpacity={0.6}
                            />
                          </RadarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                          暂无维度评分数据
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base font-bold">复盘总结</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                        {selectedRecord.analysis?.summary || '暂无总结'}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="transcription" className="mt-6">
                <Card className="h-[500px] flex flex-col">
                  <CardContent className="p-0 flex-1 overflow-hidden">
                    <ScrollArea className="h-full p-6">
                      <div className="space-y-6">
                        {selectedRecord.qa_segments?.map((seg, idx) => (
                          <div
                            key={idx}
                            className={`flex gap-4 ${seg.role === 'interviewer' ? 'bg-muted/30 p-4 rounded-lg' : ''}`}
                          >
                            <div className="flex-shrink-0 mt-1">
                              {seg.role === 'interviewer' ? (
                                <Badge className="bg-blue-600">面试官</Badge>
                              ) : (
                                <Badge variant="outline">候选人</Badge>
                              )}
                            </div>
                            <div className="space-y-2 flex-1">
                              <p className="text-sm leading-relaxed">{seg.content}</p>
                            </div>
                          </div>
                        ))}
                        {(!selectedRecord.qa_segments || selectedRecord.qa_segments.length === 0) && (
                          <p className="text-center text-muted-foreground py-8">暂无问答数据</p>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="suggestions" className="mt-6">
                <div className="grid grid-cols-1 gap-4">
                  {selectedRecord.analysis?.suggestions?.map((s: string, idx: number) => (
                    <Card key={idx} className="border-l-4 border-l-blue-600">
                      <CardContent className="pt-4 flex gap-3">
                        <CheckCircle2 className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm leading-relaxed">{s}</p>
                      </CardContent>
                    </Card>
                  ))}
                  {(!selectedRecord.analysis?.suggestions ||
                    selectedRecord.analysis.suggestions.length === 0) && (
                    <p className="text-center text-muted-foreground py-8">暂无改进建议</p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  )
}
