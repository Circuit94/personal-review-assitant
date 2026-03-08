'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Trash2, Upload, Mic, Loader2, FileAudio, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

const ACCEPTED_AUDIO_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/webm',
  'audio/ogg',
  'audio/mp4',
  'audio/m4a',
  'audio/x-m4a',
]

interface InterviewNote {
  id: string
  company: string
  position: string
  notes: string
  audio_url?: string
  transcription?: string
  ai_analysis?: string
  created_at: string
}

export function InterviewNotes() {
  const supabase = createClient()
  const { user } = useAuth()
  const [notes, setNotes] = useState<InterviewNote[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [expandedAnalysis, setExpandedAnalysis] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [formData, setFormData] = useState({
    company: '',
    position: '',
    notes: '',
    transcription: '',
    aiAnalysis: '',
  })

  useEffect(() => {
    if (user) {
      fetchNotes(user.id)
    }
  }, [user])

  const fetchNotes = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('interview_notes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setNotes(data || [])
    } catch (error) {
      console.error('获取面试记录失败:', error)
    }
  }

  const handleAudioSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!ACCEPTED_AUDIO_TYPES.includes(file.type)) {
      toast.error('请上传音频文件（支持 MP3, WAV, WebM, OGG, M4A 格式）')
      return
    }

    if (file.size > 25 * 1024 * 1024) {
      toast.error('文件大小不能超过 25MB')
      return
    }

    setAudioFile(file)
    toast.success(`已选择文件: ${file.name}`)
  }

  const handleTranscribe = async () => {
    if (!audioFile) {
      toast.error('请先上传音频文件')
      return
    }

    setTranscribing(true)
    try {
      const formDataObj = new FormData()
      formDataObj.append('audio', audioFile)

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formDataObj,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '转写失败')
      }

      const data = await response.json()
      setFormData((prev) => ({
        ...prev,
        notes: prev.notes
          ? `${prev.notes}\n\n--- 录音转写 ---\n${data.text}`
          : data.text,
        transcription: data.text,
      }))
      toast.success('录音转写完成')
    } catch (error) {
      console.error('Transcription failed:', error)
      toast.error(
        error instanceof Error ? error.message : '录音转写失败，请重试'
      )
    } finally {
      setTranscribing(false)
    }
  }

  const handleAnalyze = async () => {
    const textToAnalyze = formData.transcription || formData.notes
    if (!textToAnalyze) {
      toast.error('请先添加面试内容或转写录音')
      return
    }

    setAnalyzing(true)
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textToAnalyze,
          company: formData.company,
          position: formData.position,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '分析失败')
      }

      const data = await response.json()
      setFormData((prev) => ({ ...prev, aiAnalysis: data.analysis }))
      toast.success('AI 分析完成')
    } catch (error) {
      console.error('Analysis failed:', error)
      toast.error(
        error instanceof Error ? error.message : 'AI 分析失败，请重试'
      )
    } finally {
      setAnalyzing(false)
    }
  }

  const handleAddNote = async () => {
    if (!formData.company || !formData.position || !formData.notes || !user) {
      toast.error('请填写公司、岗位和面试内容')
      return
    }

    setLoading(true)
    try {
      const insertData: Record<string, string> = {
        user_id: user.id,
        company: formData.company,
        position: formData.position,
        notes: formData.notes,
      }

      if (formData.transcription) {
        insertData.transcription = formData.transcription
      }
      if (formData.aiAnalysis) {
        insertData.ai_analysis = formData.aiAnalysis
      }

      const { error } = await supabase
        .from('interview_notes')
        .insert(insertData)

      if (error) throw error

      toast.success('面试记录已保存')
      setFormData({
        company: '',
        position: '',
        notes: '',
        transcription: '',
        aiAnalysis: '',
      })
      setAudioFile(null)
      setShowForm(false)
      fetchNotes(user.id)
    } catch (error) {
      console.error('保存失败:', error)
      toast.error('保存失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('interview_notes')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast.success('记录已删除')
      if (user) {
        fetchNotes(user.id)
      }
    } catch (error) {
      console.error('删除失败:', error)
      toast.error('删除失败，请重试')
    }
  }

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">面试记录</h2>
        <Button onClick={() => setShowForm(!showForm)} size="sm">
          {showForm ? '取消' : '添加记录'}
        </Button>
      </div>

      {showForm && (
        <div className="mb-6 p-4 bg-slate-50 rounded-lg space-y-3">
          <Input
            placeholder="公司名称"
            value={formData.company}
            onChange={(e) =>
              setFormData({ ...formData, company: e.target.value })
            }
          />
          <Input
            placeholder="岗位名称"
            value={formData.position}
            onChange={(e) =>
              setFormData({ ...formData, position: e.target.value })
            }
          />

          {/* Audio upload section */}
          <div className="border border-dashed border-slate-300 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Mic className="w-4 h-4" />
              上传面试录音（可选）
            </div>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleAudioSelect}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-4 h-4 mr-1" />
                选择音频文件
              </Button>
              {audioFile && (
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <FileAudio className="w-3 h-3" />
                  {audioFile.name} ({(audioFile.size / 1024 / 1024).toFixed(1)}
                  MB)
                </span>
              )}
            </div>
            {audioFile && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleTranscribe}
                disabled={transcribing}
              >
                {transcribing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    转写中...
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4 mr-1" />
                    开始转写
                  </>
                )}
              </Button>
            )}
            <p className="text-xs text-slate-400">
              支持 MP3, WAV, WebM, OGG, M4A 格式，最大 25MB
            </p>
          </div>

          <Textarea
            placeholder="面试记录（你遇到的问题、如何回答等）。上传录音后点击转写可自动填充。"
            value={formData.notes}
            onChange={(e) =>
              setFormData({ ...formData, notes: e.target.value })
            }
            rows={6}
          />

          {/* AI Analysis button */}
          {formData.notes && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAnalyze}
              disabled={analyzing}
              className="w-full"
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  AI 分析中...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-1" />
                  AI 分析面试表现
                </>
              )}
            </Button>
          )}

          {/* AI Analysis result preview */}
          {formData.aiAnalysis && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-blue-700 mb-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                AI 面试分析
              </p>
              <p className="text-sm text-blue-600 whitespace-pre-wrap">
                {formData.aiAnalysis}
              </p>
            </div>
          )}

          <Button
            onClick={handleAddNote}
            disabled={loading}
            className="w-full"
          >
            {loading ? '保存中...' : '保存记录'}
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {notes.length === 0 ? (
          <p className="text-sm text-slate-500">还没有面试记录</p>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              className="p-4 border border-slate-200 rounded-lg"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-semibold text-slate-900">
                    {note.company} - {note.position}
                  </p>
                  <p className="text-xs text-slate-500">
                    {new Date(note.created_at).toLocaleDateString('zh-CN')}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(note.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">
                {note.notes}
              </p>

              {note.transcription && (
                <div className="mt-2 p-2 bg-slate-50 rounded text-xs text-slate-500">
                  <span className="font-medium">录音转写：</span>
                  {note.transcription.substring(0, 200)}
                  {note.transcription.length > 200 && '...'}
                </div>
              )}

              {note.ai_analysis && (
                <div className="mt-2">
                  <button
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                    onClick={() =>
                      setExpandedAnalysis(
                        expandedAnalysis === note.id ? null : note.id
                      )
                    }
                  >
                    <Sparkles className="w-3 h-3" />
                    {expandedAnalysis === note.id
                      ? '收起 AI 分析'
                      : '查看 AI 分析'}
                  </button>
                  {expandedAnalysis === note.id && (
                    <div className="mt-1 p-2 bg-blue-50 rounded text-sm text-blue-700 whitespace-pre-wrap">
                      {note.ai_analysis}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </Card>
  )
}
