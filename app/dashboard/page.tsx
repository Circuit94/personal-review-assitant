'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { getUserId } from '@/lib/user'
import { AddInterviewRecord } from '@/components/add-interview-record'
import { InterviewRecordCard } from '@/components/interview-record-card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface InterviewRecord {
  id: string
  user_id: string
  title: string
  content: string
  position?: string
  company?: string
  interview_date?: string
  audio_file_name?: string
  transcription?: string
  ai_analysis?: string
  created_at: string
  updated_at: string
}

export default function Dashboard() {
  const [records, setRecords] = useState<InterviewRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadRecords = useCallback(async () => {
    try {
      const userId = getUserId()
      const { data, error: fetchError } = await supabase
        .from('interview_records')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (fetchError) {
        console.error('Failed to load records:', fetchError.message)
        // Don't show error to user if table doesn't exist yet
        setRecords([])
      } else {
        setRecords(data || [])
      }
    } catch (err) {
      console.error('Failed to load records:', err)
      setRecords([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRecords()
  }, [loadRecords])

  const handleSave = async (record: {
    title: string
    content: string
    position: string
    company: string
    interview_date: string
    audio_file_name: string
    transcription: string
    ai_analysis: string
  }) => {
    const userId = getUserId()

    const insertData: Record<string, string> = {
      user_id: userId,
      title: record.title,
      content: record.content,
    }

    if (record.position) insertData.position = record.position
    if (record.company) insertData.company = record.company
    if (record.interview_date) insertData.interview_date = record.interview_date
    if (record.audio_file_name) insertData.audio_file_name = record.audio_file_name
    if (record.transcription) insertData.transcription = record.transcription
    if (record.ai_analysis) insertData.ai_analysis = record.ai_analysis

    const { error: insertError } = await supabase
      .from('interview_records')
      .insert(insertData)

    if (insertError) {
      throw new Error(insertError.message)
    }

    await loadRecords()
  }

  const handleDelete = async (id: string) => {
    const { error: deleteError } = await supabase
      .from('interview_records')
      .delete()
      .eq('id', id)

    if (deleteError) {
      setError(deleteError.message)
      return
    }

    setRecords((prev) => prev.filter((r) => r.id !== id))
  }

  const handleAnalyze = async (
    id: string,
    content: string,
    position?: string,
    company?: string
  ): Promise<string> => {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, position, company }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || '分析失败')
    }

    // Save analysis to database
    await supabase
      .from('interview_records')
      .update({ ai_analysis: data.analysis })
      .eq('id', id)

    return data.analysis
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">面试助手</h1>
          <p className="text-muted-foreground mt-1">
            记录面试经历，上传录音自动转录，AI 智能分析帮助你不断提升
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="add" className="space-y-6">
          <TabsList>
            <TabsTrigger value="add">添加记录</TabsTrigger>
            <TabsTrigger value="records">
              面试记录 {records.length > 0 && `(${records.length})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="add">
            <AddInterviewRecord onSave={handleSave} />
          </TabsContent>

          <TabsContent value="records">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-lg text-muted-foreground">加载中...</div>
              </div>
            ) : records.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-lg text-muted-foreground">暂无面试记录</p>
                <p className="text-sm text-muted-foreground mt-1">
                  点击「添加记录」开始记录你的面试经历
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {records.map((record) => (
                  <InterviewRecordCard
                    key={record.id}
                    record={record}
                    onDelete={handleDelete}
                    onAnalyze={handleAnalyze}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
