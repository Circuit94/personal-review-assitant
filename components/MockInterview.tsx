'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Brain, CheckCircle, Loader2, PlayCircle, SkipForward, MessageSquare } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'

interface Question {
  id: number
  question: string
  type: string
}

interface FeedbackItem {
  questionIndex: number
  question: string
  answer: string
  feedback: string
}

export function MockInterview({ userId }: { userId: string }) {
  const [position, setPosition] = useState('')
  const [isStarted, setIsStarted] = useState(false)
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([])
  const [showFeedback, setShowFeedback] = useState(false)
  const [currentFeedback, setCurrentFeedback] = useState<string | null>(null)
  const { toast } = useToast()

  const handleStartInterview = async () => {
    if (!position.trim()) return
    setLoading(true)
    try {
      // 获取简历内容
      const { data: resumeData } = await supabase
        .from('resumes')
        .select('extracted_text')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)

      const resumeText = resumeData?.[0]?.extracted_text || ''

      // 调用 API 生成题目
      const response = await fetch('/api/generate-interview-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ position, resumeText }),
      })

      if (!response.ok) throw new Error('生成题目失败')
      const data = await response.json()
      setQuestions(data.questions)

      if (data.fallback) {
        toast({ title: '提示', description: 'AI 暂时不可用，已使用通用面试题目' })
      }

      // 创建会话记录
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

      // 保存题目到数据库
      const questionInserts = data.questions.map((q: Question, idx: number) => ({
        session_id: session.id,
        question_number: idx + 1,
        question: q.question,
      }))

      await supabase.from('mock_interview_questions').insert(questionInserts)

      setIsStarted(true)
      setCurrentIndex(0)
      setFeedbacks([])
      setShowFeedback(false)
      setCurrentFeedback(null)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '开始面试失败'
      toast({ title: '开始面试失败', description: message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitAnswer = async () => {
    if (!answer.trim() || !sessionId || loading) return
    setLoading(true)
    setCurrentFeedback(null)

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

      // 更新数据库
      await supabase
        .from('mock_interview_questions')
        .update({
          user_answer: answer.trim(),
          ai_feedback: feedback,
          answered_at: new Date().toISOString(),
        })
        .eq('session_id', sessionId)
        .eq('question_number', currentIndex + 1)

      // 保存反馈并展示
      const newFeedback: FeedbackItem = {
        questionIndex: currentIndex,
        question: currentQuestion.question,
        answer: answer.trim(),
        feedback,
      }
      setFeedbacks((prev) => [...prev, newFeedback])
      setCurrentFeedback(feedback)
      setShowFeedback(true)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '提交回答失败'
      toast({ title: '提交回答失败', description: message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleNextQuestion = () => {
    setShowFeedback(false)
    setCurrentFeedback(null)
    setAnswer('')

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      setIsStarted(false)
      toast({ title: '面试已完成！', description: '恭喜你完成了所有题目，可以在下方查看完整反馈。' })
    }
  }

  const handleSkip = () => {
    setShowFeedback(false)
    setCurrentFeedback(null)
    setAnswer('')

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      setIsStarted(false)
    }
  }

  // 未开始状态
  if (!isStarted && feedbacks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6">
        <Brain className="h-16 w-16 text-blue-600" />
        <div className="text-center">
          <h2 className="text-2xl font-bold">准备好开始模拟面试了吗？</h2>
          <p className="text-muted-foreground mt-2">
            输入您要面试的岗位，AI 将为您生成 5 个针对性的题目并提供实时反馈
          </p>
        </div>
        <div className="w-full max-w-md space-y-4">
          <Input
            placeholder="例如：高级前端工程师 / 产品经理 / 数据分析师"
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            disabled={loading}
            onKeyDown={(e) => e.key === 'Enter' && handleStartInterview()}
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

  // 面试完成，展示所有反馈
  if (!isStarted && feedbacks.length > 0) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
          <h2 className="text-2xl font-bold">面试完成！</h2>
          <p className="text-muted-foreground">
            你完成了 {feedbacks.length}/{questions.length} 道题目，以下是详细反馈
          </p>
        </div>

        <ScrollArea className="h-[600px]">
          <div className="space-y-6 pr-4">
            {feedbacks.map((item, idx) => (
              <Card key={idx}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Q{item.questionIndex + 1}</Badge>
                    <CardTitle className="text-base">{item.question}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-xs font-medium text-blue-600 mb-1">你的回答</p>
                    <p className="text-sm text-blue-900 whitespace-pre-wrap">{item.answer}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <p className="text-xs font-medium text-green-600 mb-1">AI 反馈</p>
                    <p className="text-sm text-green-900 whitespace-pre-wrap">{item.feedback}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>

        <div className="text-center">
          <Button
            onClick={() => {
              setFeedbacks([])
              setPosition('')
            }}
            size="lg"
          >
            <PlayCircle className="mr-2 h-5 w-5" />
            再来一轮
          </Button>
        </div>
      </div>
    )
  }

  // 面试进行中
  const currentQuestion = questions[currentIndex]

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">模拟面试 - {position}</h2>
        <span className="text-sm font-medium px-3 py-1 bg-blue-100 text-blue-700 rounded-full">
          问题 {currentIndex + 1} / {questions.length}
        </span>
      </div>

      {/* 进度条 */}
      <div className="flex gap-1">
        {questions.map((_, idx) => (
          <div
            key={idx}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              idx < currentIndex
                ? 'bg-green-500'
                : idx === currentIndex
                  ? 'bg-blue-500'
                  : 'bg-gray-200'
            }`}
          />
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="text-xs">
              {currentQuestion.type === 'technical'
                ? '技术题'
                : currentQuestion.type === 'project'
                  ? '项目题'
                  : '行为题'}
            </Badge>
          </div>
          <CardTitle className="text-lg leading-relaxed">{currentQuestion.question}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!showFeedback ? (
            <Textarea
              placeholder="在这里输入您的回答...（建议使用 STAR 法则组织回答）"
              className="min-h-[200px] text-base leading-relaxed"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              disabled={loading}
            />
          ) : (
            <div className="space-y-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-xs font-medium text-blue-600 mb-1">你的回答</p>
                <p className="text-sm text-blue-900 whitespace-pre-wrap">{answer}</p>
              </div>
              {currentFeedback && (
                <div className="bg-green-50 rounded-lg p-4 animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="h-4 w-4 text-green-600" />
                    <p className="text-xs font-medium text-green-600">AI 面试官反馈</p>
                  </div>
                  <p className="text-sm text-green-900 whitespace-pre-wrap">{currentFeedback}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => {
              setIsStarted(false)
              if (feedbacks.length === 0) setFeedbacks([])
            }}
          >
            退出面试
          </Button>
          <div className="space-x-2">
            {!showFeedback ? (
              <>
                <Button variant="secondary" onClick={handleSkip} disabled={loading}>
                  <SkipForward className="mr-2 h-4 w-4" />
                  跳过
                </Button>
                <Button onClick={handleSubmitAnswer} disabled={loading || !answer.trim()}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      AI 评估中...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      提交回答
                    </>
                  )}
                </Button>
              </>
            ) : (
              <Button onClick={handleNextQuestion}>
                {currentIndex < questions.length - 1 ? '下一题 →' : '完成面试 ✓'}
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
