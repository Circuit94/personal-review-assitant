'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface Review {
  id: string
  review_content: string
  review_period_days: number
  created_at: string
}

export function InterviewReview() {
  const supabase = createClient()
  const [reviews, setReviews] = useState<Review[]>([])
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)
      if (user) {
        fetchReviews(user.id)
      }
    }
    getUser()
  }, [supabase])

  const fetchReviews = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('interview_reviews')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setReviews(data || [])
    } catch (error) {
      console.error('获取复盘分析失败:', error)
    }
  }

  const handleGenerateReview = async (daysBack: number) => {
    if (!user) {
      toast.error('请先登录')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/generate-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ daysBack }),
      })

      if (!response.ok) throw new Error('生成失败')

      await response.json()
      toast.success('复盘分析已生成')
      fetchReviews(user.id)
    } catch (error) {
      console.error('生成失败:', error)
      toast.error('生成复盘分析失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4">复盘分析</h2>

      <div className="grid grid-cols-3 gap-2 mb-6">
        <Button
          variant="outline"
          onClick={() => handleGenerateReview(7)}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            '周复盘'
          )}
        </Button>
        <Button
          variant="outline"
          onClick={() => handleGenerateReview(14)}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            '两周复盘'
          )}
        </Button>
        <Button
          variant="outline"
          onClick={() => handleGenerateReview(30)}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            '月复盘'
          )}
        </Button>
      </div>

      <div className="space-y-3">
        {reviews.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-8">
            还没有复盘分析，点击上面的按钮生成一份
          </p>
        ) : (
          reviews.map((review) => (
            <div
              key={review.id}
              className="border border-slate-200 rounded-lg overflow-hidden"
            >
              <button
                onClick={() =>
                  setExpandedId(expandedId === review.id ? null : review.id)
                }
                className="w-full text-left p-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {review.review_period_days} 日复盘
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(review.created_at).toLocaleDateString('zh-CN')}
                    </p>
                  </div>
                  <span className="text-slate-400">
                    {expandedId === review.id ? '▼' : '▶'}
                  </span>
                </div>
              </button>

              {expandedId === review.id && (
                <div className="p-4 bg-slate-50 border-t border-slate-200">
                  <div className="prose prose-sm max-w-none whitespace-pre-wrap text-slate-700 text-sm">
                    {review.review_content}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </Card>
  )
}
