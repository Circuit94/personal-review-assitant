'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Upload, Loader2, Sparkles, Mic } from 'lucide-react'

interface InterviewRecord {
  title: string
  content: string
  position: string
  company: string
  interview_date: string
  audio_file_name: string
  transcription: string
  ai_analysis: string
}

interface AddInterviewRecordProps {
  onSave: (record: InterviewRecord) => Promise<void>
}

export function AddInterviewRecord({ onSave }: AddInterviewRecordProps) {
  const [title, setTitle] = useState('')
  const [company, setCompany] = useState('')
  const [position, setPosition] = useState('')
  const [interviewDate, setInterviewDate] = useState('')
  const [content, setContent] = useState('')
  const [transcription, setTranscription] = useState('')
  const [audioFileName, setAudioFileName] = useState('')
  const [analysis, setAnalysis] = useState('')
  const [transcribing, setTranscribing] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError('')
    setTranscribing(true)
    setAudioFileName(file.name)

    try {
      const formData = new FormData()
      formData.append('audio', file)

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '转录失败')
      }

      setTranscription(data.text)
      setContent(data.text)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '音频转录失败，请重试'
      setError(message)
    } finally {
      setTranscribing(false)
    }
  }

  const handleAnalyze = async () => {
    const textToAnalyze = content || transcription
    if (!textToAnalyze) {
      setError('请先输入面试内容或上传录音')
      return
    }

    setError('')
    setAnalyzing(true)

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: textToAnalyze,
          position,
          company,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '分析失败')
      }

      setAnalysis(data.analysis)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '分析失败，请重试'
      setError(message)
    } finally {
      setAnalyzing(false)
    }
  }

  const handleSave = async () => {
    if (!title.trim()) {
      setError('请输入面试标题')
      return
    }
    if (!content.trim() && !transcription.trim()) {
      setError('请输入面试内容或上传录音')
      return
    }

    setError('')
    setSaving(true)

    try {
      await onSave({
        title: title.trim(),
        content: content.trim() || transcription.trim(),
        position: position.trim(),
        company: company.trim(),
        interview_date: interviewDate,
        audio_file_name: audioFileName,
        transcription: transcription.trim(),
        ai_analysis: analysis,
      })

      // Reset form
      setTitle('')
      setCompany('')
      setPosition('')
      setInterviewDate('')
      setContent('')
      setTranscription('')
      setAudioFileName('')
      setAnalysis('')
      setSuccess('面试记录保存成功！')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '保存失败，请重试'
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">添加面试记录</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="title">面试标题 *</Label>
            <Input
              id="title"
              placeholder="例：字节跳动前端工程师面试"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company">公司</Label>
            <Input
              id="company"
              placeholder="例：字节跳动"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="position">岗位</Label>
            <Input
              id="position"
              placeholder="例：前端工程师"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">面试日期</Label>
            <Input
              id="date"
              type="date"
              value={interviewDate}
              onChange={(e) => setInterviewDate(e.target.value)}
            />
          </div>
        </div>

        {/* Audio Upload Section */}
        <div className="space-y-2">
          <Label>上传面试录音</Label>
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={handleAudioUpload}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={transcribing}
            >
              {transcribing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  正在转录...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  选择音频文件
                </>
              )}
            </Button>
            {audioFileName && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Mic className="h-4 w-4" />
                {audioFileName}
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            支持 MP3、WAV、M4A、WebM 等常见音频格式，上传后自动转录为文字
          </p>
        </div>

        {/* Content / Transcription */}
        <div className="space-y-2">
          <Label htmlFor="content">
            面试内容 {transcription ? '(已从录音转录)' : ''}
          </Label>
          <Textarea
            id="content"
            placeholder="输入面试内容，或上传录音自动转录..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={8}
          />
        </div>

        {/* AI Analysis */}
        <div className="flex gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={handleAnalyze}
            disabled={analyzing || (!content && !transcription)}
          >
            {analyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                AI 分析中...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                AI 分析面试
              </>
            )}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                保存中...
              </>
            ) : (
              '保存记录'
            )}
          </Button>
        </div>

        {/* Analysis Result */}
        {analysis && (
          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                AI 面试分析
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                {analysis}
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  )
}
