'use client'

import { useState, useEffect, useRef } from 'react'
import { api } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'
import { Send, Loader2, MessageSquare, Bot, User } from 'lucide-react'
import type { ChatMessage } from '@/lib/types'

export function AIChat({ userId }: { userId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    initSession()
  }, [userId])

  useEffect(() => {
    // 自动滚动到底部
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, streamingContent])

  const initSession = async () => {
    try {
      // 查找或创建聊天会话
      const sessions = await api.getChatSessions('chat') as Record<string, unknown>[]

      if (sessions && sessions.length > 0) {
        const existingSession = sessions[0]
        setSessionId(existingSession.id as string)
        await loadMessages(existingSession.id as string)
      } else {
        const newSession = await api.createChatSession({
          title: 'AI 面试辅导',
          session_type: 'chat',
        }) as Record<string, unknown>
        setSessionId(newSession.id as string)
      }
    } catch (error) {
      console.error('Init session error:', error)
    }
  }

  const loadMessages = async (sid: string) => {
    const data = await api.getChatMessages(sid) as Record<string, unknown>[]
    if (data) {
      setMessages(data as unknown as ChatMessage[])
    }
  }

  const handleSend = async () => {
    if (!input.trim() || loading || !sessionId) return

    const userMessage = input.trim()
    setInput('')
    setLoading(true)

    // 乐观更新：立即显示用户消息
    const tempUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      session_id: sessionId,
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, tempUserMsg])

    try {
      // 保存用户消息到数据库
      await api.createChatMessage({
        session_id: sessionId,
        role: 'user',
        content: userMessage,
      })

      // 调用流式 AI 接口
      setStreaming(true)
      setStreamingContent('')

      const response = await api.chat(
        [...messages.slice(-18), { role: 'user', content: userMessage }].map((m) => ({
          role: m.role,
          content: m.content,
        }))
      )

      // 处理 SSE 流式响应
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              if (data === '[DONE]') break

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
      }

      setStreaming(false)
      setStreamingContent('')

      // 保存 AI 回复到数据库
      if (fullContent) {
        await api.createChatMessage({
          session_id: sessionId,
          role: 'assistant',
          content: fullContent,
        })

        const aiMsg: ChatMessage = {
          id: `ai-${Date.now()}`,
          session_id: sessionId,
          role: 'assistant',
          content: fullContent,
          created_at: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, aiMsg])
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'AI 响应失败'
      toast({ title: '发送失败', description: message, variant: 'destructive' })
      setStreaming(false)
      setStreamingContent('')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <Card className="h-[700px] flex flex-col">
      <CardHeader className="border-b px-6 py-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageSquare className="h-5 w-5 text-blue-600" />
          AI 面试辅导专家
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          我可以帮你优化简历、模拟面试、提供职业规划建议。试试问我任何面试相关的问题！
        </p>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        {/* 消息列表 */}
        <ScrollArea className="flex-1 p-6" ref={scrollRef}>
          <div className="space-y-6">
            {messages.length === 0 && !streaming && (
              <div className="text-center py-12 text-muted-foreground">
                <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">开始对话吧！你可以问我：</p>
                <div className="mt-4 space-y-2 text-xs">
                  <p>• 如何准备技术面试？</p>
                  <p>• 帮我优化自我介绍</p>
                  <p>• STAR 法则怎么用？</p>
                  <p>• 如何谈薪资？</p>
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-blue-600" />
                  </div>
                )}
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-muted'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
                {msg.role === 'user' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                    <User className="h-4 w-4 text-gray-600" />
                  </div>
                )}
              </div>
            ))}

            {/* 流式输出中的消息 */}
            {streaming && streamingContent && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-blue-600" />
                </div>
                <div className="max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed bg-muted">
                  <p className="whitespace-pre-wrap">{streamingContent}</p>
                  <span className="inline-block w-2 h-4 bg-blue-600 animate-pulse ml-1" />
                </div>
              </div>
            )}

            {/* 加载指示器 */}
            {loading && !streamingContent && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-blue-600" />
                </div>
                <div className="rounded-2xl px-4 py-3 bg-muted">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* 输入区域 */}
        <div className="border-t p-4">
          <div className="flex gap-2">
            <Textarea
              placeholder="输入你的问题...（Shift+Enter 换行）"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              className="min-h-[44px] max-h-[120px] resize-none"
              rows={1}
            />
            <Button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              size="icon"
              className="h-11 w-11 shrink-0"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
