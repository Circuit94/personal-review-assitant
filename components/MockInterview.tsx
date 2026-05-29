'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { api, getToken } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import {
  Brain,
  Loader2,
  PlayCircle,
  Send,
  Square,
  Timer,
  RotateCcw,
  Mic,
  User,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface Message {
  role: 'interviewer' | 'candidate'
  content: string
  timestamp: number
}

type InterviewPhase = 'idle' | 'preparing' | 'ongoing' | 'ended'

export function MockInterview({ userId }: { userId: string }) {
  const [position, setPosition] = useState('')
  const [phase, setPhase] = useState<InterviewPhase>('idle')
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [elapsedTime, setElapsedTime] = useState(0)
  const [isInterviewEnded, setIsInterviewEnded] = useState(false)
  const [resumeText, setResumeText] = useState('')

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const { toast } = useToast()

  // 自动滚动到底部
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingContent, scrollToBottom])

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

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  // 调用流式 API
  const sendToInterviewer = async (conversationMessages: Message[]) => {
    setIsStreaming(true)
    setStreamingContent('')

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
          position,
          resumeText,
          messages: apiMessages,
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
                setStreamingContent(fullContent)
              }
            } catch {
              // 忽略解析错误
            }
          }
        }
      }

      // 检查是否面试结束
      let displayContent = fullContent
      if (fullContent.includes('[INTERVIEW_END]')) {
        displayContent = fullContent.replace('[INTERVIEW_END]', '').trim()
        setIsInterviewEnded(true)
        setPhase('ended')
        if (timerRef.current) {
          clearInterval(timerRef.current)
          timerRef.current = null
        }
      }

      // 添加面试官消息
      const interviewerMessage: Message = {
        role: 'interviewer',
        content: displayContent,
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, interviewerMessage])
      setStreamingContent('')
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        // 用户主动中断
        return
      }
      const message = error instanceof Error ? error.message : '面试官响应失败'
      toast({ title: '出错了', description: message, variant: 'destructive' })
    } finally {
      setIsStreaming(false)
      abortControllerRef.current = null
    }
  }

  // 开始面试
  const handleStartInterview = async () => {
    if (!position.trim()) return
    setPhase('preparing')

    try {
      // 获取简历
      const resumeData = (await api.getResumes()) as Record<string, unknown>[]
      const resume = (resumeData?.[0]?.extracted_text as string) || ''
      setResumeText(resume)

      // 创建会话记录
      await api.createChatSession({
        title: `${position} - 模拟面试（对话模式）`,
        session_type: 'mock_interview',
        position,
      })

      // 重置状态
      setMessages([])
      setElapsedTime(0)
      setIsInterviewEnded(false)
      setPhase('ongoing')

      // 让面试官开场
      await sendToInterviewer([])
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '开始面试失败'
      toast({ title: '开始面试失败', description: message, variant: 'destructive' })
      setPhase('idle')
    }
  }

  // 发送回答
  const handleSendAnswer = async () => {
    if (!inputValue.trim() || isStreaming || isInterviewEnded) return

    const candidateMessage: Message = {
      role: 'candidate',
      content: inputValue.trim(),
      timestamp: Date.now(),
    }

    const updatedMessages = [...messages, candidateMessage]
    setMessages(updatedMessages)
    setInputValue('')

    // 重置 textarea 高度
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    await sendToInterviewer(updatedMessages)
  }

  // 结束面试
  const handleEndInterview = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    setPhase('ended')
    setIsInterviewEnded(true)
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  // 重新开始
  const handleRestart = () => {
    setPhase('idle')
    setMessages([])
    setElapsedTime(0)
    setIsInterviewEnded(false)
    setStreamingContent('')
    setInputValue('')
    setPosition('')
  }

  // 自动调整 textarea 高度
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value)
    const textarea = e.target
    textarea.style.height = 'auto'
    textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px'
  }

  // 键盘快捷键
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendAnswer()
    }
  }

  // ==================== 渲染 ====================

  // 空闲状态 - 开始页面
  if (phase === 'idle') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] space-y-8">
        <div className="relative">
          <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl animate-pulse" />
          <Brain className="relative h-20 w-20 text-blue-600" />
        </div>

        <div className="text-center max-w-lg">
          <h2 className="text-3xl font-bold tracking-tight">AI 模拟面试</h2>
          <p className="text-muted-foreground mt-3 text-lg">
            真实对话模式 · 动态追问 · 难度递进
          </p>
          <p className="text-muted-foreground mt-2 text-sm">
            AI 面试官会像真实面试一样与你对话，根据你的回答进行追问和深入探讨
          </p>
        </div>

        <div className="w-full max-w-md space-y-4">
          <Input
            placeholder="输入目标岗位，如：高级前端工程师 / 产品经理 / 数据分析师"
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleStartInterview()}
            className="h-12 text-base"
          />
          <Button
            className="w-full h-12 text-lg"
            onClick={handleStartInterview}
            disabled={!position.trim()}
          >
            <PlayCircle className="mr-2 h-5 w-5" />
            开始面试
          </Button>
        </div>

        <div className="flex gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Mic className="h-4 w-4" />
            <span>多轮追问</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Timer className="h-4 w-4" />
            <span>实时计时</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Brain className="h-4 w-4" />
            <span>智能评估</span>
          </div>
        </div>
      </div>
    )
  }

  // 准备中
  if (phase === 'preparing') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        <p className="text-lg font-medium">面试官正在准备...</p>
        <p className="text-sm text-muted-foreground">正在加载简历信息并生成面试方案</p>
      </div>
    )
  }

  // 面试进行中 / 已结束 - 对话界面
  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] max-w-4xl mx-auto">
      {/* 顶部状态栏 */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-background/95 backdrop-blur shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                isInterviewEnded ? 'bg-gray-400' : 'bg-green-500 animate-pulse'
              }`}
            />
            <span className="font-medium">{position}</span>
          </div>
          {!isInterviewEnded && (
            <Badge variant="secondary" className="text-xs">
              面试中
            </Badge>
          )}
          {isInterviewEnded && (
            <Badge variant="outline" className="text-xs">
              已结束
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Timer className="h-4 w-4" />
            <span className="font-mono">{formatTime(elapsedTime)}</span>
          </div>
          {!isInterviewEnded ? (
            <Button variant="destructive" size="sm" onClick={handleEndInterview}>
              <Square className="mr-1.5 h-3.5 w-3.5" />
              结束面试
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
      <div className="flex-1 overflow-y-auto min-h-0 px-4 py-6 space-y-6">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex gap-3 ${msg.role === 'candidate' ? 'flex-row-reverse' : ''}`}
          >
            {/* 头像 */}
            <div
              className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${
                msg.role === 'interviewer'
                  ? 'bg-blue-100 text-blue-600'
                  : 'bg-green-100 text-green-600'
              }`}
            >
              {msg.role === 'interviewer' ? (
                <Brain className="h-5 w-5" />
              ) : (
                <User className="h-5 w-5" />
              )}
            </div>

            {/* 消息气泡 */}
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                msg.role === 'interviewer'
                  ? 'bg-muted text-foreground rounded-tl-sm'
                  : 'bg-blue-600 text-white rounded-tr-sm'
              }`}
            >
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}

        {/* 流式输出中 */}
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

        {/* 正在输入指示器 */}
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

        {/* 面试结束提示 */}
        {isInterviewEnded && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="py-4 text-center">
              <p className="text-green-700 font-medium">面试已结束</p>
              <p className="text-sm text-green-600 mt-1">
                本次面试时长 {formatTime(elapsedTime)}，共 {messages.filter((m) => m.role === 'candidate').length} 轮对话
              </p>
              <Button variant="outline" size="sm" className="mt-3" onClick={handleRestart}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                开始新的面试
              </Button>
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
              {isStreaming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">
            像真实面试一样回答，面试官会根据你的回答进行追问
          </p>
        </div>
      )}
    </div>
  )
}
