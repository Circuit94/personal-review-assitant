'use client'

import { useState, useEffect, useRef } from 'react'
import { useChat } from '@ai-sdk/react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Send, Loader2 } from 'lucide-react'

export function AIChat() {
  const supabase = createClient()
  const [resumeContent, setResumeContent] = useState('')
  const [interviewHistory, setInterviewHistory] = useState('')
  const [user, setUser] = useState<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { messages, input, handleInputChange, handleSubmit, isLoading, setMessages } =
    useChat({
      api: '/api/chat',
      body: {
        resumeContent,
        interviewHistory,
      },
    })

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)
      if (user) {
        loadResumeAndHistory(user.id)
      }
    }
    getUser()
  }, [supabase])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadResumeAndHistory = async (userId: string) => {
    try {
      // Get resume content
      const { data: resumes } = await supabase
        .from('resumes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)

      if (resumes && resumes.length > 0) {
        // In a real app, you would fetch the PDF content from Blob storage
        setResumeContent(
          `最新简历: ${resumes[0].filename} (上传于 ${new Date(resumes[0].created_at).toLocaleDateString('zh-CN')})`
        )
      }

      // Get interview history
      const { data: notes } = await supabase
        .from('interview_notes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5)

      if (notes && notes.length > 0) {
        const historyText = notes
          .map(
            (note) =>
              `- ${note.company} (${note.position}): ${note.notes.substring(0, 100)}...`
          )
          .join('\n')
        setInterviewHistory(historyText)
      }
    } catch (error) {
      console.error('加载简历和面试记录失败:', error)
    }
  }

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (input.trim()) {
      handleSubmit(e)
    }
  }

  return (
    <Card className="p-6 h-full flex flex-col">
      <h2 className="text-xl font-semibold mb-4">AI 面试助手</h2>

      <div className="flex-1 overflow-y-auto mb-4 space-y-4 min-h-96">
        {messages.length === 0 && (
          <div className="text-center text-slate-500 py-8">
            <p>你好！我是你的面试AI助手。</p>
            <p className="text-sm mt-2">
              你可以问我任何关于面试准备、回答技巧、简历优化的问题。
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-xs px-4 py-2 rounded-lg ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-900'
              }`}
            >
              <p className="text-sm">
                {message.content}
              </p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-100 text-slate-900 px-4 py-2 rounded-lg">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={onSubmit} className="flex gap-2">
        <Input
          value={input}
          onChange={handleInputChange}
          placeholder="输入你的问题..."
          disabled={isLoading}
        />
        <Button type="submit" disabled={isLoading} size="icon">
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </Card>
  )
}
