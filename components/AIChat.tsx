'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'
import { Send, User, Bot, Loader2 } from 'lucide-react'

export function AIChat({ userId }: { userId: string }) {
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    initSession()
  }, [])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const initSession = async () => {
    try {
      // 查找现有的 chat 会话，或者创建一个新的
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('session_type', 'chat')
        .order('created_at', { ascending: false })
        .limit(1)

      if (error) throw error

      let currentSessionId = data?.[0]?.id

      if (!currentSessionId) {
        const { data: newSession, error: createError } = await supabase
          .from('chat_sessions')
          .insert({
            user_id: userId,
            title: '面试咨询对话',
            session_type: 'chat',
          })
          .select()
          .single()

        if (createError) throw createError
        currentSessionId = newSession.id
      }

      setSessionId(currentSessionId)
      fetchMessages(currentSessionId)
    } catch (error: any) {
      console.error('初始化会话失败:', error)
      toast({
        title: '会话初始化失败',
        description: error.message,
        variant: 'destructive',
      })
    }
  }

  const fetchMessages = async (sid: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sid)
        .order('created_at', { ascending: true })

      if (error) throw error
      setMessages(data || [])
    } catch (error: any) {
      console.error('获取消息失败:', error)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !sessionId || loading) return

    const userMessage = input.trim()
    setInput('')
    setLoading(true)

    try {
      // 保存用户消息到数据库
      const { data: savedUserMsg, error: userMsgError } = await supabase
        .from('chat_messages')
        .insert({
          session_id: sessionId,
          role: 'user',
          content: userMessage,
        })
        .select()
        .single()

      if (userMsgError) throw userMsgError
      setMessages((prev) => [...prev, savedUserMsg])

      // 调用 AI API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: userMessage }].map(m => ({
            role: m.role,
            content: m.content
          }))
        }),
      })

      if (!response.ok) throw new Error('AI 响应失败')

      const data = await response.json()
      const aiMessage = data.content

      // 保存 AI 消息到数据库
      const { data: savedAiMsg, error: aiMsgError } = await supabase
        .from('chat_messages')
        .insert({
          session_id: sessionId,
          role: 'assistant',
          content: aiMessage,
        })
        .select()
        .single()

      if (aiMsgError) throw aiMsgError
      setMessages((prev) => [...prev, savedAiMsg])
    } catch (error: any) {
      toast({
        title: '发送失败',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="flex flex-col h-[calc(100vh-12rem)]">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Bot className="mr-2 h-5 w-5" />
          AI 面试助手
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                有什么面试相关的问题，随时问我吧！
              </div>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-lg flex gap-3 ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-none'
                      : 'bg-muted text-foreground rounded-tl-none'
                  }`}
                >
                  <div className="flex-shrink-0">
                    {msg.role === 'user' ? (
                      <User className="h-5 w-5" />
                    ) : (
                      <Bot className="h-5 w-5" />
                    )}
                  </div>
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="max-w-[80%] p-3 rounded-lg bg-muted flex gap-3 rounded-tl-none">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <div className="text-muted-foreground italic">AI 正在思考...</div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <form onSubmit={handleSendMessage} className="flex w-full gap-2">
          <Input
            placeholder="输入您的问题..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
          />
          <Button type="submit" disabled={loading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardFooter>
    </Card>
  )
}
