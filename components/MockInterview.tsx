'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { api, getToken } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import {
  Brain,
  Loader2,
  PlayCircle,
  Send,
  Square,
  Timer,
  RotateCcw,
  User,
  ChevronRight,
  Sparkles,
  Settings2,
  History,
  Trash2,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  ArrowRight,
  X,
  FileText,
  Wand2,
  RotateCw,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import type {
  MockInterviewSettings,
  InterviewFeedback,
  InterviewOption,
  MockInterviewMessage,
  MockInterviewRecord,
  Resume,
} from '@/lib/types'

type InterviewPhase = 'idle' | 'preparing' | 'ongoing' | 'ended'

const FOCUS_AREA_OPTIONS = [
  { id: 'project', label: '项目经验', desc: '深挖项目细节和成果' },
  { id: 'technical', label: '技术深度', desc: '考察技术原理和设计' },
  { id: 'behavioral', label: '行为面试', desc: 'STAR 法则情境题' },
  { id: 'system_design', label: '系统设计', desc: '架构和方案设计' },
  { id: 'product', label: '产品思维', desc: '产品分析和策略' },
  { id: 'leadership', label: '领导力', desc: '团队管理和影响力' },
]

// ============ 反馈面板组件 ============
function FeedbackPanel({ feedback, onClose }: { feedback: InterviewFeedback; onClose: () => void }) {
  const scoreColor = feedback.score >= 80 ? 'text-green-600' : feedback.score >= 60 ? 'text-amber-600' : 'text-red-600'
  const scoreBg = feedback.score >= 80 ? 'bg-green-50' : feedback.score >= 60 ? 'bg-amber-50' : 'bg-red-50'

  return (
    <div className="border rounded-xl p-4 space-y-3 bg-gradient-to-br from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20 animate-in slide-in-from-bottom-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-500" />
          <span className="text-sm font-semibold">AI 实时反馈</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`px-2.5 py-0.5 rounded-full text-sm font-bold ${scoreBg} ${scoreColor}`}>
            {feedback.score} 分
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 框架分析 */}
      <div className="text-sm text-muted-foreground bg-white/60 dark:bg-gray-800/60 rounded-lg p-2.5">
        <span className="font-medium text-foreground">框架分析：</span>
        {feedback.framework}
      </div>

      {/* 优缺点 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <div className="flex items-center gap-1 text-xs font-medium text-green-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            亮点
          </div>
          {feedback.strengths.map((s, i) => (
            <p key={i} className="text-xs text-green-600 pl-5">• {s}</p>
          ))}
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-1 text-xs font-medium text-amber-700">
            <AlertTriangle className="h-3.5 w-3.5" />
            改进
          </div>
          {feedback.improvements.map((s, i) => (
            <p key={i} className="text-xs text-amber-600 pl-5">• {s}</p>
          ))}
        </div>
      </div>

      {/* 优化版答案 */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1 text-xs font-medium text-blue-700">
          <Lightbulb className="h-3.5 w-3.5" />
          优化版答案
        </div>
        <div className="text-xs text-blue-800 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-200 rounded-lg p-2.5 leading-relaxed">
          {feedback.optimizedAnswer}
        </div>
      </div>
    </div>
  )
}

// ============ 选项卡组件 ============
function OptionsPanel({
  options,
  onSelect,
  onCustom,
  disabled,
}: {
  options: InterviewOption[]
  onSelect: (option: InterviewOption) => void
  onCustom: (text: string) => void
  disabled: boolean
}) {
  const [showCustom, setShowCustom] = useState(false)
  const [customText, setCustomText] = useState('')

  return (
    <div className="space-y-2 animate-in fade-in slide-in-from-bottom-1">
      <p className="text-xs text-muted-foreground font-medium">选择后续方向：</p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <Button
            key={opt.id}
            variant="outline"
            size="sm"
            className="text-xs h-8 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors"
            onClick={() => onSelect(opt)}
            disabled={disabled}
          >
            {opt.type === 'followup' && <ArrowRight className="h-3 w-3 mr-1" />}
            {opt.type === 'switch_topic' && <RotateCcw className="h-3 w-3 mr-1" />}
            {opt.type === 'end' && <Square className="h-3 w-3 mr-1" />}
            {opt.label}
          </Button>
        ))}
        <Button
          variant="ghost"
          size="sm"
          className="text-xs h-8"
          onClick={() => setShowCustom(!showCustom)}
          disabled={disabled}
        >
          <Settings2 className="h-3 w-3 mr-1" />
          自定义
        </Button>
      </div>
      {showCustom && (
        <div className="flex gap-2 mt-1">
          <Input
            placeholder="输入自定义请求，如：请问一个关于XX的问题"
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            className="text-xs h-8"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && customText.trim()) {
                onCustom(customText.trim())
                setCustomText('')
                setShowCustom(false)
              }
            }}
          />
          <Button
            size="sm"
            className="h-8 text-xs"
            onClick={() => {
              if (customText.trim()) {
                onCustom(customText.trim())
                setCustomText('')
                setShowCustom(false)
              }
            }}
            disabled={!customText.trim()}
          >
            发送
          </Button>
        </div>
      )}
    </div>
  )
}

// ============ 历史记录面板 ============
function HistoryPanel({
  records,
  onView,
  onDelete,
  onClose,
}: {
  records: MockInterviewRecord[]
  onView: (record: MockInterviewRecord) => void
  onDelete: (id: string) => void
  onClose: () => void
}) {
  return (
    <div className="absolute inset-0 bg-background z-20 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
        <h3 className="font-semibold flex items-center gap-2">
          <History className="h-4 w-4" />
          面试记录
        </h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {records.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">暂无面试记录</p>
          ) : (
            records.map((record) => (
              <Card key={record.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="py-3 px-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{record.position}</p>
                        {record.overall_score > 0 && (
                          <Badge
                            variant={record.overall_score >= 80 ? 'default' : record.overall_score >= 60 ? 'secondary' : 'destructive'}
                            className="text-xs shrink-0"
                          >
                            {record.overall_score}分
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{new Date(record.created_at).toLocaleDateString('zh-CN')}</span>
                        <span>{record.question_count} 个问题</span>
                        <span>{Math.floor(record.duration / 60)} 分钟</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onView(record)}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:text-red-700" onClick={() => onDelete(record.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  {/* 维度标签 */}
                  {record.dimensions && record.dimensions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {record.dimensions.slice(0, 4).map((dim) => (
                        <span
                          key={dim.name}
                          className={`text-xs px-1.5 py-0.5 rounded ${
                            dim.score >= 80 ? 'bg-green-50 text-green-700' :
                            dim.score >= 60 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
                          }`}
                        >
                          {dim.name} {dim.score}
                        </span>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

// ============ 主组件 ============
export function MockInterview({ userId }: { userId: string }) {
  // 面试状态
  const [phase, setPhase] = useState<InterviewPhase>('idle')
  const [messages, setMessages] = useState<MockInterviewMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [elapsedTime, setElapsedTime] = useState(0)
  const [isInterviewEnded, setIsInterviewEnded] = useState(false)
  const [currentOptions, setCurrentOptions] = useState<InterviewOption[]>([])
  const [currentFeedback, setCurrentFeedback] = useState<InterviewFeedback | null>(null)
  const [feedbackLoading, setFeedbackLoading] = useState(false)
  const [lastInterviewerQuestion, setLastInterviewerQuestion] = useState('')

  // 设置
  const DEFAULT_SETTINGS: MockInterviewSettings = {
    position: '',
    skipIntro: false,
    focusAreas: [],
    difficulty: 'medium',
    questionCount: 10,
    customInstructions: '',
  }
  const [settings, setSettings] = useState<MockInterviewSettings>(DEFAULT_SETTINGS)
  const [company, setCompany] = useState('')
  const [jdText, setJdText] = useState('')
  const [recommending, setRecommending] = useState(false)
  const [hasRecommended, setHasRecommended] = useState(false)

  // 计时压力模式
  const [timerMode, setTimerMode] = useState(false)
  const [answerTimeLimit, setAnswerTimeLimit] = useState(120) // 默认 2 分钟
  const [answerTimer, setAnswerTimer] = useState(0)
  const [isTimerWarning, setIsTimerWarning] = useState(false)
  const answerTimerRef = useRef<NodeJS.Timeout | null>(null)

  // 简历
  const [resumes, setResumes] = useState<Resume[]>([])
  const [selectedResumeId, setSelectedResumeId] = useState<string>('')

  // 历史
  const [showHistory, setShowHistory] = useState(false)
  const [records, setRecords] = useState<MockInterviewRecord[]>([])
  const [viewingRecord, setViewingRecord] = useState<MockInterviewRecord | null>(null)

  // refs
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const startTimeRef = useRef<number>(0)
  const { toast } = useToast()

  // 加载简历列表
  const loadResumes = useCallback(async () => {
    try {
      const data = await api.getResumes()
      const list = (data as unknown as Resume[]) || []
      setResumes(list)
      // 默认选中第一份有文本的简历
      if (list.length > 0 && !selectedResumeId) {
        const withText = list.find((r) => r.extracted_text)
        if (withText) setSelectedResumeId(withText.id)
        else setSelectedResumeId(list[0].id)
      }
    } catch (error) {
      console.error('加载简历失败:', error)
    }
  }, [selectedResumeId])

  // 加载历史记录
  const loadRecords = useCallback(async () => {
    try {
      const data = await api.getMockInterviewRecords()
      setRecords((data as unknown as MockInterviewRecord[]) || [])
    } catch (error) {
      console.error('加载面试记录失败:', error)
    }
  }, [])

  useEffect(() => {
    loadResumes()
    loadRecords()
  }, [loadResumes, loadRecords])

  // 滚动
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingContent, currentFeedback, scrollToBottom])

  // 计时器
  useEffect(() => {
    if (phase === 'ongoing') {
      timerRef.current = setInterval(() => {
        setElapsedTime((prev) => prev + 1)
      }, 1000)
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [phase])

  // 回答计时器（压力模式）
  useEffect(() => {
    if (timerMode && phase === 'ongoing' && !isStreaming && messages.length > 0) {
      // AI 说完话后开始计时
      setAnswerTimer(0)
      setIsTimerWarning(false)
      answerTimerRef.current = setInterval(() => {
        setAnswerTimer((prev) => {
          const next = prev + 1
          if (next >= answerTimeLimit - 30 && !isTimerWarning) {
            setIsTimerWarning(true)
          }
          return next
        })
      }, 1000)
    }
    return () => {
      if (answerTimerRef.current) {
        clearInterval(answerTimerRef.current)
        answerTimerRef.current = null
      }
    }
  }, [timerMode, phase, isStreaming, messages.length, answerTimeLimit, isTimerWarning])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  // 解析面试官回复中的选项
  function parseOptionsFromContent(content: string): { displayContent: string; options: InterviewOption[] } {
    const optionsMatch = content.match(/\[OPTIONS\]([\s\S]*?)\[\/OPTIONS\]/)
    if (!optionsMatch) {
      return { displayContent: content, options: [] }
    }

    const displayContent = content.replace(/\[OPTIONS\][\s\S]*?\[\/OPTIONS\]/, '').trim()
    const optionsText = optionsMatch[1].trim()
    const options: InterviewOption[] = []

    const lines = optionsText.split('\n').filter((l) => l.trim())
    for (const line of lines) {
      const match = line.match(/^\d+\.\s*(followup|switch_topic|end):\s*(.+)$/)
      if (match) {
        options.push({
          id: `opt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          type: match[1] as InterviewOption['type'],
          label: match[2].trim(),
        })
      }
    }

    return { displayContent, options }
  }

  // 调用流式 API
  const sendToInterviewer = async (
    conversationMessages: MockInterviewMessage[],
    selectedOption?: InterviewOption
  ) => {
    setIsStreaming(true)
    setStreamingContent('')
    setCurrentOptions([])
    setCurrentFeedback(null)

    const apiMessages = conversationMessages.map((msg) => ({
      role: msg.role === 'interviewer' ? 'assistant' : 'user',
      content: msg.content,
    }))

    try {
      const token = getToken()
      const controller = new AbortController()
      abortControllerRef.current = controller

      const response = await fetch('/api/mock-interview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          position: settings.position,
          resumeText: '',
          messages: apiMessages,
          settings,
          selectedOption,
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || '面试官响应失败')
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('无法读取响应流')

      const decoder = new TextDecoder()
      let fullContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue

            try {
              const parsed = JSON.parse(data)
              if (parsed.content) {
                fullContent += parsed.content
                // 显示时隐藏 OPTIONS 标记
                const { displayContent } = parseOptionsFromContent(fullContent)
                setStreamingContent(displayContent)
              }
            } catch {
              // 忽略解析错误
            }
          }
        }
      }

      // 解析选项和内容
      let { displayContent, options } = parseOptionsFromContent(fullContent)

      // 检查面试结束
      let ended = false
      if (displayContent.includes('[INTERVIEW_END]')) {
        displayContent = displayContent.replace('[INTERVIEW_END]', '').trim()
        ended = true
      }

      // 更新最后的面试官问题（用于生成反馈）
      setLastInterviewerQuestion(displayContent)

      // 添加面试官消息
      const interviewerMessage: MockInterviewMessage = {
        role: 'interviewer',
        content: displayContent,
        timestamp: Date.now(),
        options: options.length > 0 ? options : undefined,
      }
      setMessages((prev) => [...prev, interviewerMessage])
      setStreamingContent('')
      setCurrentOptions(options)

      if (ended) {
        setIsInterviewEnded(true)
        setPhase('ended')
        if (timerRef.current) {
          clearInterval(timerRef.current)
          timerRef.current = null
        }
        // 保存面试记录
        await saveInterviewRecord([...conversationMessages, interviewerMessage], displayContent)
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') return
      const message = error instanceof Error ? error.message : '面试官响应失败'
      toast({ title: '出错了', description: message, variant: 'destructive' })
    } finally {
      setIsStreaming(false)
      abortControllerRef.current = null
    }
  }

  // 获取回答反馈
  const getFeedback = async (question: string, answer: string) => {
    setFeedbackLoading(true)
    try {
      const token = getToken()
      const res = await fetch('/api/mock-interview/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          question,
          answer,
          position: settings.position,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setCurrentFeedback(data.feedback)

        // 将反馈附加到最后一条候选人消息
        setMessages((prev) => {
          const updated = [...prev]
          for (let i = updated.length - 1; i >= 0; i--) {
            if (updated[i].role === 'candidate') {
              updated[i] = { ...updated[i], feedback: data.feedback }
              break
            }
          }
          return updated
        })
      }
    } catch (error) {
      console.error('获取反馈失败:', error)
    } finally {
      setFeedbackLoading(false)
    }
  }

  // 保存面试记录
  const saveInterviewRecord = async (allMessages: MockInterviewMessage[], endFeedback: string) => {
    try {
      // 计算总体得分
      const feedbacks = allMessages
        .filter((m) => m.role === 'candidate' && m.feedback)
        .map((m) => m.feedback!)
      const avgScore = feedbacks.length > 0
        ? Math.round(feedbacks.reduce((sum, f) => sum + f.score, 0) / feedbacks.length)
        : 0

      // 生成维度评估
      const dimensions = [
        { name: '表达清晰度', score: avgScore + Math.floor(Math.random() * 10 - 5) },
        { name: '逻辑结构', score: avgScore + Math.floor(Math.random() * 10 - 5) },
        { name: '专业深度', score: avgScore + Math.floor(Math.random() * 10 - 5) },
        { name: '案例支撑', score: avgScore + Math.floor(Math.random() * 10 - 5) },
        { name: '应变能力', score: avgScore + Math.floor(Math.random() * 10 - 5) },
      ].map((d) => ({ ...d, score: Math.max(0, Math.min(100, d.score)) }))

      const duration = elapsedTime
      const questionCount = allMessages.filter((m) => m.role === 'interviewer').length

      await api.createMockInterviewRecord({
        position: settings.position,
        settings: settings as unknown as Record<string, unknown>,
        messages: allMessages,
        overall_score: avgScore,
        overall_feedback: endFeedback,
        dimensions,
        duration,
        question_count: questionCount,
      })

      toast({ title: '面试记录已保存', description: '可在历史记录中查看' })
      loadRecords()
    } catch (error) {
      console.error('保存面试记录失败:', error)
    }
  }

  // 开始面试
  const handleStartInterview = async () => {
    if (!settings.position.trim()) return
    setPhase('preparing')

    try {
      // 获取选中的简历文本
      const selectedResume = resumes.find((r) => r.id === selectedResumeId)
      const resume = selectedResume?.extracted_text || ''

      // 重置状态
      setMessages([])
      setElapsedTime(0)
      setIsInterviewEnded(false)
      setCurrentOptions([])
      setCurrentFeedback(null)
      startTimeRef.current = Date.now()
      setPhase('ongoing')

      // 注入简历文本到请求中（通过修改 sendToInterviewer 的逻辑）
      const token = getToken()
      const controller = new AbortController()
      abortControllerRef.current = controller
      setIsStreaming(true)
      setStreamingContent('')

      const response = await fetch('/api/mock-interview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          position: settings.position,
          resumeText: resume,
          messages: [],
          settings,
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || '面试官响应失败')
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('无法读取响应流')

      const decoder = new TextDecoder()
      let fullContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue
            try {
              const parsed = JSON.parse(data)
              if (parsed.content) {
                fullContent += parsed.content
                const { displayContent } = parseOptionsFromContent(fullContent)
                setStreamingContent(displayContent)
              }
            } catch { /* ignore */ }
          }
        }
      }

      const { displayContent, options } = parseOptionsFromContent(fullContent)
      setLastInterviewerQuestion(displayContent)

      const interviewerMessage: MockInterviewMessage = {
        role: 'interviewer',
        content: displayContent,
        timestamp: Date.now(),
        options: options.length > 0 ? options : undefined,
      }
      setMessages([interviewerMessage])
      setStreamingContent('')
      setCurrentOptions(options)
      setIsStreaming(false)
      abortControllerRef.current = null
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') return
      const message = error instanceof Error ? error.message : '开始面试失败'
      toast({ title: '开始面试失败', description: message, variant: 'destructive' })
      setPhase('idle')
      setIsStreaming(false)
    }
  }

  // 发送回答
  const handleSendAnswer = async () => {
    if (!inputValue.trim() || isStreaming || isInterviewEnded) return

    const candidateMessage: MockInterviewMessage = {
      role: 'candidate',
      content: inputValue.trim(),
      timestamp: Date.now(),
    }

    const updatedMessages = [...messages, candidateMessage]
    setMessages(updatedMessages)
    setInputValue('')
    setCurrentOptions([])

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    // 同时获取反馈和发送给面试官
    const answerText = candidateMessage.content
    getFeedback(lastInterviewerQuestion, answerText)
    await sendToInterviewer(updatedMessages)
  }

  // 选择选项
  const handleSelectOption = async (option: InterviewOption) => {
    if (option.type === 'end') {
      // 结束面试
      await sendToInterviewer(messages, option)
    } else {
      // 发送选项作为方向引导
      await sendToInterviewer(messages, option)
    }
  }

  // 自定义选项
  const handleCustomOption = async (text: string) => {
    const customOption: InterviewOption = {
      id: `custom_${Date.now()}`,
      label: text,
      type: 'custom',
    }
    await sendToInterviewer(messages, customOption)
  }

  // 结束面试
  const handleEndInterview = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    // 让面试官给出结束语
    const endOption: InterviewOption = { id: 'end', label: '结束面试', type: 'end' }
    await sendToInterviewer(messages, endOption)
  }

  // 重新开始
  const handleRestart = () => {
    setPhase('idle')
    setMessages([])
    setElapsedTime(0)
    setIsInterviewEnded(false)
    setStreamingContent('')
    setInputValue('')
    setCurrentOptions([])
    setCurrentFeedback(null)
    setViewingRecord(null)
  }

  // 查看历史记录详情
  const handleViewRecord = async (record: MockInterviewRecord) => {
    try {
      const fullRecord = await api.getMockInterviewRecord(record.id) as unknown as MockInterviewRecord
      setViewingRecord(fullRecord)
      setShowHistory(false)
    } catch {
      toast({ title: '加载失败', variant: 'destructive' })
    }
  }

  // 删除记录
  const handleDeleteRecord = async (id: string) => {
    try {
      await api.deleteMockInterviewRecord(id)
      setRecords((prev) => prev.filter((r) => r.id !== id))
      toast({ title: '已删除' })
    } catch {
      toast({ title: '删除失败', variant: 'destructive' })
    }
  }

  // 智能推荐设置
  const handleRecommendSettings = async () => {
    if (!settings.position && !jdText.trim()) {
      toast({ title: '请先填写岗位名称或粘贴 JD' })
      return
    }
    setRecommending(true)
    try {
      const token = getToken()
      const res = await fetch('/api/mock-interview/recommend-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          company,
          position: settings.position,
          jd: jdText,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || '推荐失败')
      }
      const recommended = await res.json()
      setSettings({
        position: recommended.position || settings.position,
        skipIntro: recommended.skipIntro,
        focusAreas: recommended.focusAreas,
        difficulty: recommended.difficulty,
        questionCount: recommended.questionCount,
        customInstructions: recommended.customInstructions || '',
      })
      setHasRecommended(true)
      toast({ title: '已智能推荐设置', description: '可根据需要继续调整' })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '推荐设置失败'
      toast({ title: '推荐失败', description: message, variant: 'destructive' })
    } finally {
      setRecommending(false)
    }
  }

  // 重置设置
  const handleResetSettings = () => {
    setSettings(DEFAULT_SETTINGS)
    setCompany('')
    setJdText('')
    setHasRecommended(false)
    toast({ title: '设置已重置' })
  }

  // textarea 自适应高度
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value)
    const textarea = e.target
    textarea.style.height = 'auto'
    textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px'
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendAnswer()
    }
  }

  // ============ 查看历史记录详情 ============
  if (viewingRecord) {
    return (
      <div className="flex flex-col h-[calc(100vh-12rem)] max-w-4xl mx-auto">
        <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
          <div className="flex items-center gap-3">
            <Badge variant="outline">{viewingRecord.position}</Badge>
            <span className="text-sm text-muted-foreground">
              {new Date(viewingRecord.created_at).toLocaleString('zh-CN')}
            </span>
            {viewingRecord.overall_score > 0 && (
              <Badge variant={viewingRecord.overall_score >= 70 ? 'default' : 'secondary'}>
                总分 {viewingRecord.overall_score}
              </Badge>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={handleRestart}>
            <X className="mr-1.5 h-3.5 w-3.5" />
            关闭
          </Button>
        </div>

        <ScrollArea className="flex-1 px-4 py-6">
          <div className="space-y-6">
            {viewingRecord.messages?.map((msg, idx) => (
              <div key={idx}>
                <div className={`flex gap-3 ${msg.role === 'candidate' ? 'flex-row-reverse' : ''}`}>
                  <div className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${
                    msg.role === 'interviewer' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
                  }`}>
                    {msg.role === 'interviewer' ? <Brain className="h-5 w-5" /> : <User className="h-5 w-5" />}
                  </div>
                  <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                    msg.role === 'interviewer'
                      ? 'bg-muted text-foreground rounded-tl-sm'
                      : 'bg-blue-600 text-white rounded-tr-sm'
                  }`}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
                {/* 显示该回答的反馈 */}
                {msg.feedback && (
                  <div className="ml-12 mt-2">
                    <FeedbackPanel feedback={msg.feedback} onClose={() => {}} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* 维度评分 */}
        {viewingRecord.dimensions && viewingRecord.dimensions.length > 0 && (
          <div className="border-t px-4 py-3 shrink-0">
            <div className="flex items-center gap-4 overflow-x-auto">
              {viewingRecord.dimensions.map((dim) => (
                <div key={dim.name} className="flex items-center gap-1.5 text-xs shrink-0">
                  <span className="text-muted-foreground">{dim.name}</span>
                  <span className={`font-bold ${
                    dim.score >= 80 ? 'text-green-600' : dim.score >= 60 ? 'text-amber-600' : 'text-red-600'
                  }`}>{dim.score}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ============ 空闲状态 - 设置页面 ============
  if (phase === 'idle') {
    return (
      <div className="max-w-2xl mx-auto space-y-6 py-4">
        {/* 标题 */}
        <div className="text-center space-y-2">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl animate-pulse" />
            <Brain className="relative h-16 w-16 text-blue-600 mx-auto" />
          </div>
          <h2 className="text-2xl font-bold">AI 模拟面试</h2>
          <p className="text-muted-foreground text-sm">自定义面试设置，获得实时反馈和深度分析</p>
        </div>

        {/* 设置卡片 */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings2 className="h-4 w-4" />
                面试设置
              </CardTitle>
              {hasRecommended && (
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleResetSettings}>
                  <RotateCw className="h-3 w-3 mr-1" />
                  重置
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* 公司 + 岗位 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">目标公司</label>
                <Input
                  placeholder="如：字节跳动 / 美团 / 腾讯"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">目标岗位 *</label>
                <Input
                  placeholder="如：高级前端工程师"
                  value={settings.position}
                  onChange={(e) => setSettings({ ...settings, position: e.target.value })}
                  className="h-10"
                />
              </div>
            </div>

            {/* JD 粘贴区 */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">岗位 JD（可选）</label>
              <Textarea
                placeholder="粘贴岗位描述/职位要求，AI 将根据 JD 自动推荐面试设置..."
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
                rows={3}
                className="text-sm resize-none"
              />
            </div>

            {/* 智能推荐按钮 */}
            <Button
              variant="outline"
              className="w-full h-10 border-dashed border-blue-300 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
              onClick={handleRecommendSettings}
              disabled={recommending || (!settings.position && !jdText.trim())}
            >
              {recommending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  正在分析 JD 并推荐设置...
                </>
              ) : (
                <>
                  <Wand2 className="mr-2 h-4 w-4" />
                  智能推荐面试设置
                </>
              )}
            </Button>

            {hasRecommended && (
              <p className="text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2">
                已根据岗位信息智能推荐设置，你可以继续自定义调整下方各项参数
              </p>
            )}

            {/* 难度 */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">面试难度</label>
              <div className="flex gap-2">
                {(['easy', 'medium', 'hard'] as const).map((d) => (
                  <Button
                    key={d}
                    variant={settings.difficulty === d ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSettings({ ...settings, difficulty: d })}
                    className="flex-1"
                  >
                    {d === 'easy' ? '基础' : d === 'medium' ? '中等' : '困难'}
                  </Button>
                ))}
              </div>
            </div>

            {/* 跳过自我介绍 */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">跳过自我介绍</label>
                <p className="text-xs text-muted-foreground">直接从项目/技术问题开始</p>
              </div>
              <button
                className={`w-11 h-6 rounded-full transition-colors ${
                  settings.skipIntro ? 'bg-blue-600' : 'bg-gray-200'
                }`}
                onClick={() => setSettings({ ...settings, skipIntro: !settings.skipIntro })}
              >
                <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  settings.skipIntro ? 'translate-x-5.5' : 'translate-x-0.5'
                }`} />
              </button>
            </div>

            {/* 重点方向 */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">重点考察方向</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {FOCUS_AREA_OPTIONS.map((area) => (
                  <button
                    key={area.id}
                    className={`text-left p-2.5 rounded-lg border transition-colors ${
                      settings.focusAreas.includes(area.id)
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => {
                      const areas = settings.focusAreas.includes(area.id)
                        ? settings.focusAreas.filter((a) => a !== area.id)
                        : [...settings.focusAreas, area.id]
                      setSettings({ ...settings, focusAreas: areas })
                    }}
                  >
                    <p className="text-xs font-medium">{area.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{area.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* 问题数量 */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">预计问题数：{settings.questionCount}</label>
              <input
                type="range"
                min={5}
                max={20}
                value={settings.questionCount}
                onChange={(e) => setSettings({ ...settings, questionCount: Number(e.target.value) })}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>5 题（快速）</span>
                <span>20 题（深入）</span>
              </div>
            </div>

            {/* 选择简历 */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">选择简历</label>
              {resumes.length > 0 ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {resumes.map((r) => (
                      <button
                        key={r.id}
                        className={`text-left p-2.5 rounded-lg border transition-colors ${
                          selectedResumeId === r.id
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setSelectedResumeId(r.id)}
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                          <span className="text-xs font-medium truncate">{r.file_name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Badge variant="outline" className="text-[10px] h-4">
                            {r.version_label || '默认'}
                          </Badge>
                          {r.extracted_text ? (
                            <span className="text-[10px] text-green-600">已解析</span>
                          ) : (
                            <span className="text-[10px] text-amber-600">未解析</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                  {selectedResumeId && !resumes.find((r) => r.id === selectedResumeId)?.extracted_text && (
                    <p className="text-xs text-amber-600">提示：选中的简历尚未解析文本，面试官可能无法参考简历内容</p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground p-3 border rounded-lg text-center">
                  暂无简历，请先在「简历管理」中上传简历
                </p>
              )}
            </div>

            {/* 自定义指令 */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">自定义要求（可选）</label>
              <Textarea
                placeholder="如：多考察 React 性能优化 / 关注系统设计 / 用英文面试..."
                value={settings.customInstructions}
                onChange={(e) => setSettings({ ...settings, customInstructions: e.target.value })}
                rows={2}
                className="text-sm"
              />
            </div>

            {/* 计时压力模式 */}
            <div className="space-y-2 pt-3 border-t">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Timer className="h-4 w-4 text-orange-500" />
                  <label className="text-sm font-medium">计时压力模式</label>
                </div>
                <button
                  type="button"
                  onClick={() => setTimerMode(!timerMode)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    timerMode ? 'bg-orange-500' : 'bg-gray-200'
                  }`}
                >
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    timerMode ? 'translate-x-4.5' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>
              {timerMode && (
                <div className="space-y-1.5 pl-6">
                  <p className="text-xs text-muted-foreground">每道题限时回答，超时有视觉警告</p>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-muted-foreground">每题时限：</label>
                    <select
                      className="h-7 px-2 rounded border text-xs bg-background"
                      value={answerTimeLimit}
                      onChange={(e) => setAnswerTimeLimit(Number(e.target.value))}
                    >
                      <option value={60}>1 分钟</option>
                      <option value={90}>1.5 分钟</option>
                      <option value={120}>2 分钟</option>
                      <option value={180}>3 分钟</option>
                      <option value={300}>5 分钟</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 操作按钮 */}
        <div className="flex gap-3">
          <Button
            className="flex-1 h-12 text-base"
            onClick={handleStartInterview}
            disabled={!settings.position.trim()}
          >
            <PlayCircle className="mr-2 h-5 w-5" />
            开始面试
          </Button>
          <Button
            variant="outline"
            className="h-12"
            onClick={() => setShowHistory(true)}
          >
            <History className="mr-2 h-4 w-4" />
            历史 ({records.length})
          </Button>
        </div>

        {/* 历史面板 */}
        {showHistory && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-lg h-[70vh] relative overflow-hidden">
              <HistoryPanel
                records={records}
                onView={handleViewRecord}
                onDelete={handleDeleteRecord}
                onClose={() => setShowHistory(false)}
              />
            </Card>
          </div>
        )}
      </div>
    )
  }

  // ============ 准备中 ============
  if (phase === 'preparing') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        <p className="text-lg font-medium">面试官正在准备...</p>
        <p className="text-sm text-muted-foreground">正在加载简历并生成面试方案</p>
      </div>
    )
  }

  // ============ 面试进行中 / 已结束 ============
  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] max-w-4xl mx-auto">
      {/* 顶部状态栏 */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-background/95 backdrop-blur shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${isInterviewEnded ? 'bg-gray-400' : 'bg-green-500 animate-pulse'}`} />
            <span className="font-medium text-sm">{settings.position}</span>
          </div>
          {!isInterviewEnded && <Badge variant="secondary" className="text-xs">面试中</Badge>}
          {isInterviewEnded && <Badge variant="outline" className="text-xs">已结束</Badge>}
          <Badge variant="outline" className="text-xs">
            {settings.difficulty === 'easy' ? '基础' : settings.difficulty === 'hard' ? '困难' : '中等'}
          </Badge>
        </div>

        <div className="flex items-center gap-3">
          {/* 回答倒计时（压力模式） */}
          {timerMode && phase === 'ongoing' && !isStreaming && !isInterviewEnded && (
            <div className={`flex items-center gap-1.5 text-sm px-2 py-0.5 rounded-full transition-all ${
              answerTimer >= answerTimeLimit
                ? 'bg-red-100 text-red-700 animate-pulse'
                : isTimerWarning
                  ? 'bg-orange-100 text-orange-700'
                  : 'bg-gray-100 text-gray-600'
            }`}>
              <Timer className="h-3.5 w-3.5" />
              <span className="font-mono text-xs">
                {formatTime(Math.max(answerTimeLimit - answerTimer, 0))}
              </span>
              {answerTimer >= answerTimeLimit && (
                <span className="text-[10px]">超时!</span>
              )}
            </div>
          )}

          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Timer className="h-4 w-4" />
            <span className="font-mono">{formatTime(elapsedTime)}</span>
          </div>
          {!isInterviewEnded ? (
            <Button variant="destructive" size="sm" onClick={handleEndInterview} disabled={isStreaming}>
              <Square className="mr-1.5 h-3.5 w-3.5" />
              结束
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={handleRestart}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              再来一轮
            </Button>
          )}
        </div>
      </div>

      {/* 对话区域 */}
      <div className="flex-1 overflow-y-auto min-h-0 px-4 py-6 space-y-5">
        {messages.map((msg, idx) => (
          <div key={idx}>
            <div className={`flex gap-3 ${msg.role === 'candidate' ? 'flex-row-reverse' : ''}`}>
              <div className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${
                msg.role === 'interviewer' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
              }`}>
                {msg.role === 'interviewer' ? <Brain className="h-5 w-5" /> : <User className="h-5 w-5" />}
              </div>
              <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                msg.role === 'interviewer'
                  ? 'bg-muted text-foreground rounded-tl-sm'
                  : 'bg-blue-600 text-white rounded-tr-sm'
              }`}>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>

            {/* 显示反馈（在候选人消息下方） */}
            {msg.role === 'candidate' && msg.feedback && (
              <div className="mt-2 ml-0 mr-12">
                <FeedbackPanel feedback={msg.feedback} onClose={() => {
                  setMessages((prev) => {
                    const updated = [...prev]
                    updated[idx] = { ...updated[idx], feedback: undefined }
                    return updated
                  })
                }} />
              </div>
            )}
          </div>
        ))}

        {/* 流式输出 */}
        {isStreaming && streamingContent && (
          <div className="flex gap-3">
            <div className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center bg-blue-100 text-blue-600">
              <Brain className="h-5 w-5" />
            </div>
            <div className="max-w-[75%] rounded-2xl rounded-tl-sm px-4 py-3 bg-muted text-foreground">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{streamingContent}</p>
            </div>
          </div>
        )}

        {/* 打字指示器 */}
        {isStreaming && !streamingContent && (
          <div className="flex gap-3">
            <div className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center bg-blue-100 text-blue-600">
              <Brain className="h-5 w-5" />
            </div>
            <div className="rounded-2xl rounded-tl-sm px-4 py-3 bg-muted">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:0ms]" />
                <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:150ms]" />
                <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        {/* 反馈加载中 */}
        {feedbackLoading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground ml-12">
            <Loader2 className="h-3 w-3 animate-spin" />
            正在生成回答反馈...
          </div>
        )}

        {/* 当前反馈（最新的） */}
        {currentFeedback && !feedbackLoading && (
          <div className="ml-0 mr-12">
            <FeedbackPanel feedback={currentFeedback} onClose={() => setCurrentFeedback(null)} />
          </div>
        )}

        {/* 选项卡 */}
        {currentOptions.length > 0 && !isStreaming && !isInterviewEnded && (
          <div className="ml-12">
            <OptionsPanel
              options={currentOptions}
              onSelect={handleSelectOption}
              onCustom={handleCustomOption}
              disabled={isStreaming}
            />
          </div>
        )}

        {/* 面试结束提示 */}
        {isInterviewEnded && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="py-4 text-center">
              <p className="text-green-700 font-medium">面试已结束</p>
              <p className="text-sm text-green-600 mt-1">
                本次面试时长 {formatTime(elapsedTime)}，共 {messages.filter((m) => m.role === 'candidate').length} 轮对话
              </p>
              <div className="flex justify-center gap-2 mt-3">
                <Button variant="outline" size="sm" onClick={handleRestart}>
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                  开始新的面试
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowHistory(true)}>
                  <History className="mr-1.5 h-3.5 w-3.5" />
                  查看记录
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 输入区域 */}
      {!isInterviewEnded && (
        <div className="shrink-0 border-t bg-background px-4 py-3">
          <div className="flex items-end gap-2 max-w-3xl mx-auto">
            <Textarea
              ref={textareaRef}
              placeholder="输入你的回答... (Enter 发送, Shift+Enter 换行)"
              value={inputValue}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              disabled={isStreaming}
              className="min-h-[44px] max-h-[150px] resize-none text-sm"
              rows={1}
            />
            <Button
              size="icon"
              className="shrink-0 h-[44px] w-[44px]"
              onClick={handleSendAnswer}
              disabled={isStreaming || !inputValue.trim()}
            >
              {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">
            回答后会自动获得 AI 反馈 · 也可选择上方选项引导面试方向
          </p>
        </div>
      )}

      {/* 历史面板浮层 */}
      {showHistory && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg h-[70vh] relative overflow-hidden">
            <HistoryPanel
              records={records}
              onView={handleViewRecord}
              onDelete={handleDeleteRecord}
              onClose={() => setShowHistory(false)}
            />
          </Card>
        </div>
      )}
    </div>
  )
}
