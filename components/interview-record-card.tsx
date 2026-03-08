'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sparkles, Loader2, ChevronDown, ChevronUp, Mic, Trash2, Building2, Briefcase, Calendar } from 'lucide-react'

interface InterviewRecordData {
  id: string
  title: string
  content: string
  position?: string
  company?: string
  interview_date?: string
  audio_file_name?: string
  transcription?: string
  ai_analysis?: string
  created_at: string
}

interface InterviewRecordCardProps {
  record: InterviewRecordData
  onDelete?: (id: string) => void
  onAnalyze?: (id: string, content: string, position?: string, company?: string) => Promise<string>
}

export function InterviewRecordCard({ record, onDelete, onAnalyze }: InterviewRecordCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [showAnalysis, setShowAnalysis] = useState(false)
  const [analysis, setAnalysis] = useState(record.ai_analysis || '')
  const [analyzing, setAnalyzing] = useState(false)

  const handleAnalyze = async () => {
    if (!onAnalyze) return
    setAnalyzing(true)
    try {
      const result = await onAnalyze(record.id, record.content, record.position, record.company)
      setAnalysis(result)
      setShowAnalysis(true)
    } catch {
      // Error handling done in parent
    } finally {
      setAnalyzing(false)
    }
  }

  const formattedDate = record.interview_date
    ? new Date(record.interview_date).toLocaleDateString('zh-CN')
    : record.created_at
      ? new Date(record.created_at).toLocaleDateString('zh-CN')
      : ''

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <CardTitle className="text-lg">{record.title}</CardTitle>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {record.company && (
                <span className="flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {record.company}
                </span>
              )}
              {record.position && (
                <span className="flex items-center gap-1">
                  <Briefcase className="h-3 w-3" />
                  {record.position}
                </span>
              )}
              {formattedDate && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formattedDate}
                </span>
              )}
              {record.audio_file_name && (
                <Badge variant="secondary" className="text-xs">
                  <Mic className="h-3 w-3 mr-1" />
                  录音转录
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(record.id)}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Content preview / full */}
        <div className="text-sm">
          {expanded ? (
            <div className="whitespace-pre-wrap">{record.content}</div>
          ) : (
            <div className="line-clamp-3 whitespace-pre-wrap">{record.content}</div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" />
                收起
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" />
                展开全文
              </>
            )}
          </Button>

          {!analysis && onAnalyze && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAnalyze}
              disabled={analyzing}
            >
              {analyzing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  分析中...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-1" />
                  AI 分析
                </>
              )}
            </Button>
          )}

          {analysis && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAnalysis(!showAnalysis)}
            >
              <Sparkles className="h-4 w-4 mr-1" />
              {showAnalysis ? '隐藏分析' : '查看分析'}
            </Button>
          )}
        </div>

        {/* Analysis section */}
        {showAnalysis && analysis && (
          <Card className="bg-muted/50">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2 font-medium text-sm">
                <Sparkles className="h-4 w-4" />
                AI 面试分析
              </div>
              <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm">
                {analysis}
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  )
}
