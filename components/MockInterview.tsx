'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Brain, CheckCircle, Loader2, PlayCircle, SkipForward } from 'lucide-react'

export function MockInterview({ userId }: { userId: string }) {
  const [position, setPosition] = useState('')
  const [isStarted, setIsStarted] = useState(false)
  const [questions, setQuestions] = useState<any[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const { toast } = useToast()

  const handleStartInterview = async () => {
    if (!position.trim()) return
    setLoading(true)
    try {
      // 1. 获取简历内容 (可选)
      const { data: resumeData } = await supabase
        .from('resumes')
        .select('extracted_text')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)

      const resumeText = resumeData?.[0]?.extracted_text || ''

      // 2. 调用 API 生成题目
      const response = await fetch('/api/generate-interview-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ position, resumeText }),
      })

      if (!response.ok) throw new Error('生成题目失败')
      const data = await response.json()
      setQuestions(data.questions)

      // 3. 创建会话记录
      const { data: session, error: sessionError } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: userId,
          title: `${position} - 模拟面试`,
          session_type: 'mock_interview',
          position,
        })
        .select()
        .single()

      if (sessionError) throw sessionError
      setSessionId(session.id)

      // 4. 保存题目到数据库
      const questionInserts = data.questions.map((q: any, idx: number) => ({
        session_id: session.id,
        question_number: idx + 1,
        question: q.question,
      }))

      const { error: questionsError } = await supabase
        .from('mock_interview_questions')
        .insert(questionInserts)

      if (questionsError) throw questionsError

      setIsStarted(true)
      setCurrentIndex(0)
    } catch (error: any) {
      console.error('开始面试失败:', error)
      toast({
        title: '开始面试失败',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitAnswer = async () => {
    if (!answer.trim() || !sessionId || loading) return
    setLoading(true)
    try {
      const currentQuestion = questions[currentIndex]

      // 调用 AI 获取反馈
      const response = await fetch('/api/get-interview-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: currentQuestion.question,
          answer: answer.trim(),
        }),
      })

      if (!response.ok) throw new Error('获取反馈失败')
      const data = await response.json()
      const feedback = data.feedback

      // 更新数据库中的题目
      const { error: updateError } = await supabase
        .from('mock_interview_questions')
        .update({
          user_answer: answer.trim(),
          ai_feedback: feedback,
          answered_at: new Date().toISOString(),
        })
        .eq('session_id', sessionId)
        .eq('question_number', currentIndex + 1)

      if (updateError) throw updateError

      toast({ title: '回答已提交' })

      if (currentIndex < questions.length - 1) {
        setCurrentIndex(currentIndex + 1)
        setAnswer('')
      } else {
        setIsStarted(false)
        toast({ title: '面试已完成', description: '您可以在面试记录中查看详细反馈' })
      }
    } catch (error: any) {
      toast({
        title: '提交回答失败',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  if (!isStarted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6">
        <Brain className="h-16 w-16 text-blue-600" />
        <div className="text-center">
          <h2 className="text-2xl font-bold">准备好开始模拟面试了吗？</h2>
          <p className="text-muted-foreground mt-2">输入您要面试的岗位，我们将为您生成 5 个针对性的题目</p>
        </div>
        <div className="w-full max-w-md space-y-4">
          <Input
            placeholder="例如：高级前端工程师 / 产品经理"
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            disabled={loading}
          />
          <Button
            className="w-full h-12 text-lg"
            onClick={handleStartInterview}
            disabled={loading || !position.trim()}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                正在生成面试题目...
              </>
            ) : (
              <>
                <PlayCircle className="mr-2 h-5 w-5" />
                开始面试
              </>
            )}
          </Button>
        </div>
      </div>
    )
  }

  const currentQuestion = questions[currentIndex]

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">模拟面试 - {position}</h2>
        <span className="text-sm font-medium px-3 py-1 bg-blue-100 text-blue-700 rounded-full">
          问题 {currentIndex + 1} / {questions.length}
        </span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg leading-relaxed">{currentQuestion.question}</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="在这里输入您的回答..."
            className="min-h-[200px] text-lg leading-relaxed"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={loading}
          />
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => setIsStarted(false)}>
            退出面试
          </Button>
          <div className="space-x-2">
            <Button
              variant="secondary"
              onClick={() => {
                if (currentIndex < questions.length - 1) {
                  setCurrentIndex(currentIndex + 1)
                  setAnswer('')
                } else {
                  setIsStarted(false)
                }
              }}
              disabled={loading}
            >
              <SkipForward className="mr-2 h-4 w-4" />
              跳过
            </Button>
            <Button onClick={handleSubmitAnswer} disabled={loading || !answer.trim()}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  提交中...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  {currentIndex < questions.length - 1 ? '下一题' : '完成面试'}
                </>
              )}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
