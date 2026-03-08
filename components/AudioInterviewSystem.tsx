'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Mic, Upload, FileAudio, Play, Loader2, CheckCircle2, AlertCircle, BarChart3, ChevronRight, FileDown, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'
import * as XLSX from 'xlsx'

export function AudioInterviewSystem({ userId }: { userId: string }) {
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [selectedRecord, setSelectedRecord] = useState<any>(null)
  const { toast } = useToast()

  useEffect(() => {
    fetchRecords()
    const interval = setInterval(fetchRecords, 5000) // Poll every 5 seconds for status updates
    return () => clearInterval(interval)
  }, [])

  const exportToPDF = () => {
    if (!selectedRecord) return
    const doc = new jsPDF() as any
    doc.text(`面试分析报告: ${selectedRecord.title}`, 10, 10)
    doc.text(`综合评分: ${selectedRecord.analysis?.score || 0}`, 10, 20)
    doc.text(`总结: ${selectedRecord.analysis?.summary || ''}`, 10, 30)

    const tableData = selectedRecord.qa_segments?.map((seg: any) => [
      seg.role === 'interviewer' ? '面试官' : '候选人',
      seg.content,
      `${Math.floor((seg.start_time || 0) / 60)}:${((seg.start_time || 0) % 60).toString().padStart(2, '0')}`
    ]) || []

    doc.autoTable({
      head: [['角色', '内容', '时间戳']],
      body: tableData,
      startY: 40,
    })

    doc.save(`${selectedRecord.title}_分析报告.pdf`)
  }

  const exportToExcel = () => {
    if (!selectedRecord) return
    const ws = XLSX.utils.json_to_sheet(selectedRecord.qa_segments || [])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "问答详情")
    XLSX.writeFile(wb, `${selectedRecord.title}_分析报告.xlsx`)
  }

  const fetchRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('interview_audio_records')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setRecords(data || [])
    } catch (error: any) {
      console.error('获取音频记录失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const file = e.dataTransfer.files?.[0]
    if (file) {
      await processFile(file)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      await processFile(file)
    }
  }

  const processFile = async (file: File) => {
    // 校验格式
    const validFormats = ['.mp3', '.wav', '.m4a']
    const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()
    if (!validFormats.includes(fileExt)) {
      toast({ title: '格式错误', description: '仅支持 MP3, WAV, M4A 格式', variant: 'destructive' })
      return
    }

    // Limit 500MB
    if (file.size > 500 * 1024 * 1024) {
      toast({ title: '文件太大', description: '单个文件不能超过 500MB', variant: 'destructive' })
      return
    }

    setUploading(true)
    setUploadProgress(10)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('userId', userId)
      formData.append('title', file.name.split('.')[0])

      const response = await fetch('/api/audio/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '上传失败')
      }
      
      setUploadProgress(100)
      toast({ title: '上传成功', description: '正在后台进行转写与智能分析...' })
      fetchRecords()
    } catch (error: any) {
      console.error('上传失败详情:', error)
      toast({ title: '上传失败', description: error.message, variant: 'destructive' })
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="secondary">等待中</Badge>
      case 'transcribing': return <Badge variant="outline" className="animate-pulse">转写中...</Badge>
      case 'analyzing': return <Badge variant="outline" className="animate-pulse">分析中...</Badge>
      case 'completed': return <Badge variant="default" className="bg-green-600">已完成</Badge>
      case 'failed': return <Badge variant="destructive">失败</Badge>
      default: return <Badge variant="secondary">{status}</Badge>
    }
  }

  const RadarData = [
    { subject: '表达清晰度', A: 80, fullMark: 100 },
    { subject: '逻辑性', A: 90, fullMark: 100 },
    { subject: '技术深度', A: 70, fullMark: 100 },
    { subject: '自信度', A: 85, fullMark: 100 },
    { subject: 'STAR法则', A: 65, fullMark: 100 },
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* 左侧：列表与上传 */}
      <div className="lg:col-span-1 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5 text-blue-600" />
              面试录音上传
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div 
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 hover:bg-muted/50 transition-all cursor-pointer relative min-h-[160px]"
            >
              <Input
                type="file"
                accept=".mp3,.wav,.m4a"
                onChange={handleFileUpload}
                disabled={uploading}
                className="absolute inset-0 opacity-0 cursor-pointer z-10"
              />
              <div className="flex flex-col items-center justify-center">
                <Upload className="h-10 w-10 text-muted-foreground mb-4" />
                <p className="text-sm font-medium">点击或拖拽上传面试录音</p>
                <p className="text-xs text-muted-foreground mt-2">支持 MP3, WAV, M4A (最大 500MB)</p>
              </div>
            </div>
            {uploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span>正在上传...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-1" />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="flex flex-col h-[600px]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileAudio className="h-5 w-5 text-blue-600" />
              历史录音
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-hidden">
            <ScrollArea className="h-full px-4 pb-4">
              <div className="space-y-3">
                {records.map((record) => (
                  <div
                    key={record.id}
                    onClick={() => record.status === 'completed' && setSelectedRecord(record)}
                    className={`p-4 border rounded-lg cursor-pointer transition-all hover:border-blue-400 ${selectedRecord?.id === record.id ? 'bg-blue-50 border-blue-400' : ''}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-sm truncate max-w-[150px]">{record.title}</h4>
                      {getStatusBadge(record.status)}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Play className="h-3 w-3" />
                      {(record.file_size / (1024 * 1024)).toFixed(1)} MB | {new Date(record.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
                {records.length === 0 && !loading && (
                  <div className="text-center py-12 text-muted-foreground">
                    <p className="text-sm italic">暂无录音，立即上传您的第一份面试录音</p>
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
          <Card className="h-full flex flex-col items-center justify-center p-12 text-center bg-muted/20 border-dashed">
            <BarChart3 className="h-16 w-16 text-muted-foreground/30 mb-6" />
            <h3 className="text-xl font-bold text-muted-foreground">选择一份录音查看深度分析</h3>
            <p className="text-muted-foreground mt-2 max-w-sm">
              我们的 AI 将自动识别面试官提问与候选人回答，并从多维度为您提供专业反馈。
            </p>
          </Card>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Mic className="h-6 w-6 text-blue-600" />
                {selectedRecord.title} - 面试复盘报告
              </h2>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={exportToPDF}>
                  <FileDown className="mr-2 h-4 w-4" />
                  导出 PDF
                </Button>
                <Button variant="outline" size="sm" onClick={exportToExcel}>
                  <FileDown className="mr-2 h-4 w-4" />
                  导出 Excel
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
                      <h4 className="text-4xl font-bold text-blue-700">{selectedRecord.analysis?.score || 0}</h4>
                    </CardContent>
                  </Card>
                  <Card className="bg-green-50/50 border-green-100">
                    <CardContent className="pt-6 text-center">
                      <p className="text-sm font-medium text-green-600 mb-1">情感倾向</p>
                      <h4 className="text-2xl font-bold text-green-700">{selectedRecord.analysis?.sentiment || '中性'}</h4>
                    </CardContent>
                  </Card>
                  <Card className="bg-purple-50/50 border-purple-100">
                    <CardContent className="pt-6 text-center">
                      <p className="text-sm font-medium text-purple-600 mb-1">关键词</p>
                      <div className="flex flex-wrap justify-center gap-1">
                        {selectedRecord.analysis?.keywords?.slice(0, 3).map((k: string) => (
                          <Badge key={k} variant="secondary" className="bg-purple-100 text-purple-700 hover:bg-purple-200">
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
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={RadarData}>
                          <PolarGrid />
                          <PolarAngleAxis dataKey="subject" />
                          <PolarRadiusAxis angle={30} domain={[0, 100]} />
                          <Radar name="候选人" dataKey="A" stroke="#2563eb" fill="#3b82f6" fillOpacity={0.6} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base font-bold">复盘总结</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                        {selectedRecord.analysis?.summary}
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
                        {selectedRecord.qa_segments?.map((seg: any, idx: number) => (
                          <div key={idx} className={`flex gap-4 ${seg.role === 'interviewer' ? 'bg-muted/30 p-4 rounded-lg' : ''}`}>
                            <div className="flex-shrink-0 mt-1">
                              {seg.role === 'interviewer' ? (
                                <Badge className="bg-blue-600">面试官</Badge>
                              ) : (
                                <Badge variant="outline">候选人</Badge>
                              )}
                            </div>
                            <div className="space-y-2 flex-1">
                              <p className="text-sm leading-relaxed">{seg.content}</p>
                              {seg.start_time !== undefined && (
                                <p className="text-[10px] text-muted-foreground italic">
                                  时间戳: {Math.floor(seg.start_time / 60)}:{(seg.start_time % 60).toString().padStart(2, '0')}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
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
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  )
}
