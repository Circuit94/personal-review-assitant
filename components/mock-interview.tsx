'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Loader2, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'

interface Question {
  question: string
  difficulty: string
  category: string
}

export function MockInterview() {
  const [jobTitle, setJobTitle] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionStarted, setSessionStarted] = useState(false)
  const [answers, setAnswers] = useState<string[]>([])

  const handleGenerateQuestions = async () => {
    if (!jobTitle) {
      toast.error('请输入岗位名称')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/generate-interview-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobTitle,
          jobDescription,
        }),
      })

      if (!response.ok) throw new Error('生成失败')

      const data = await response.json()
      setQuestions(data.questions)
      setSessionStarted(true)
      setCurrentIndex(0)
      setAnswer('')
      setAnswers([])
      toast.success('面试题目已生成，开始答题吧！')
    } catch (error) {
      console.error('生成失败:', error)
      toast.error('生成面试题目失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const handleNextQuestion = () => {
    if (!answer.trim()) {
      toast.error('请先回答当前问题')
      return
    }

    const newAnswers = [...answers, answer]
    setAnswers(newAnswers)
    setAnswer('')

    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(currentIndex + 1)
    } else {
      toast.success('恭喜！你已完成全部问题。')
      setTimeout(() => {
        setSessionStarted(false)
        setQuestions([])
      }, 1500)
    }
  }

  if (!sessionStarted) {
    return (
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">模拟面试</h2>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700">
              岗位名称
            </label>
            <Input
              placeholder="例：前端工程师、后端开发..."
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              disabled={loading}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">
              岗位描述 (可选)
            </label>
            <Textarea
              placeholder="描述该岗位的主要职责和要求..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              disabled={loading}
              rows={4}
            />
          </div>

          <Button
            onClick={handleGenerateQuestions}
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                生成中...
              </>
            ) : (
              '生成 5 道面试题目'
            )}
          </Button>
        </div>
      </Card>
    )
  }

  if (questions.length === 0) {
    return null
  }

  const currentQuestion = questions[currentIndex]
  const progress = ((currentIndex + 1) / questions.length) * 100

  return (
    <Card className="p-6">
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-semibold">
            问题 {currentIndex + 1}/{questions.length}
          </h2>
          <span className="text-sm text-slate-600">
            难度: <span className="font-medium">{currentQuestion.difficulty}</span>
          </span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="bg-slate-50 p-4 rounded-lg mb-4">
        <p className="text-sm text-slate-600 mb-2">问题分类: {currentQuestion.category}</p>
        <p className="text-lg font-medium text-slate-900">
          {currentQuestion.question}
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-slate-700 block mb-2">
            你的回答
          </label>
          <Textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="请详细回答问题..."
            rows={6}
          />
        </div>

        <Button onClick={handleNextQuestion} className="w-full">
          {currentIndex + 1 === questions.length ? (
            '完成'
          ) : (
            <>
              下一题 <ChevronRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </Card>
  )
}
