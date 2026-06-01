'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { Send, Loader2, MessageSquare, Bot, User } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import type { ChatMessage } from '@/lib/types'

export function AIChat({ userId }: { userId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  void userId // userId is handled by auth token

  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [])

  useEffect(() => {
    initSession()
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingContent, scrollToBottom])

  const initSession = async () => {
    try {
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

    const tempUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      session_id: sessionId,
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, tempUserMsg])

    try {
      await api.createChatMessage({
        session_id: sessionId,
        role: 'user',
        content: userMessage,
      })

      setStreaming(true)
      setStreamingContent('')

      const response = await api.chat(
        [...messages.slice(-18), { role: 'user', content: userMessage }].map((m) => ({
          role: m.role,
          content: m.content,
        }))
      )

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
    <Card className="flex flex-col" style={{ height: 'calc(100vh - 200px)', minHeight: '500px', maxHeight: '800px' }}>
      <CardHeader className="border-b px-6 py-4 shrink-0">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageSquare className="h-5 w-5 text-blue-600" />
          AI 面试辅导专家
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          我可以帮你优化简历、模拟面试、提供职业规划建议。试试问我任何面试相关的问题！
        </p>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 min-h-0">
        {/* 消息列表 - 使用原生 overflow-y-auto 替代 ScrollArea */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto p-6 min-h-0"
        >
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
                  {msg.role === 'user' ? (
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  ) : (
                    <div className="markdown-body">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  )}
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
                  <div className="markdown-body">
                    <ReactMarkdown>{streamingContent}</ReactMarkdown>
                  </div>
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

            {/* 滚动锚点 */}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* 输入区域 - 固定在底部 */}
        <div className="border-t p-4 shrink-0">
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
