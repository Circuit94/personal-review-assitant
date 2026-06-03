'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import {
  Brain,
  Plus,
  Loader2,
  Sparkles,
  CheckCircle2,
  X,
  Tag,
  Edit3,
  Trash2,
  TrendingUp,
  Calendar,
  Filter,
  Layers,
} from 'lucide-react'
import type { Flashcard } from '@/lib/types'

type ViewMode = 'cards' | 'review' | 'stats'

export function FlashCards({ userId }: { userId: string }) {
  const [cards, setCards] = useState<Flashcard[]>([])
  const [dueCards, setDueCards] = useState<Flashcard[]>([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<ViewMode>('cards')
  const [filterTag, setFilterTag] = useState<string | null>(null)
  const { toast } = useToast()

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingCard, setEditingCard] = useState<Flashcard | null>(null)
  const [formQuestion, setFormQuestion] = useState('')
  const [formAnswer, setFormAnswer] = useState('')
  const [formTags, setFormTags] = useState('')
  const [formJd, setFormJd] = useState('')
  const [saving, setSaving] = useState(false)

  const [optimizing, setOptimizing] = useState<string | null>(null)
  const [optimizedAnswer, setOptimizedAnswer] = useState('')
  const [showOptimized, setShowOptimized] = useState<string | null>(null)

  const [reviewIndex, setReviewIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [reviewing, setReviewing] = useState(false)

  void userId

  const loadCards = useCallback(async () => {
    try {
      const data = await api.getFlashcards(filterTag ? { tag: filterTag } : undefined)
      setCards(data as unknown as Flashcard[])
    } catch (error) {
      console.error('Load flashcards error:', error)
    }
  }, [filterTag])

  const loadDueCards = useCallback(async () => {
    try {
      const data = await api.getFlashcards({ due: true })
      setDueCards(data as unknown as Flashcard[])
    } catch (error) {
      console.error('Load due cards error:', error)
    }
  }, [])

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await Promise.all([loadCards(), loadDueCards()])
      setLoading(false)
    }
    init()
  }, [loadCards, loadDueCards])

  const allTags = Array.from(new Set(cards.flatMap(c => c.tags))).sort()

  const resetForm = () => {
    setFormQuestion('')
    setFormAnswer('')
    setFormTags('')
    setFormJd('')
    setEditingCard(null)
  }

  const handleSaveCard = async () => {
    if (!formQuestion.trim()) return
    setSaving(true)
    try {
      const tags = formTags.split(/[,\u{FF0C}]/u).map(t => t.trim()).filter(Boolean)
      if (editingCard) {
        await api.updateFlashcard({
          id: editingCard.id,
          question: formQuestion,
          answer: formAnswer,
          tags,
          jd_reference: formJd || undefined,
        })
        toast({ title: '卡片已更新' })
      } else {
        await api.createFlashcard({
          question: formQuestion,
          answer: formAnswer,
          tags,
          jd_reference: formJd || undefined,
        })
        toast({ title: '卡片已创建' })
      }
      setShowCreateForm(false)
      resetForm()
      await loadCards()
      await loadDueCards()
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '保存失败'
      toast({ title: '保存失败', description: msg, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除这张卡片？')) return
    try {
      await api.deleteFlashcard(id)
      toast({ title: '已删除' })
      await loadCards()
      await loadDueCards()
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '删除失败'
      toast({ title: '删除失败', description: msg, variant: 'destructive' })
    }
  }

  const handleOptimize = async (card: Flashcard) => {
    if (!card.answer?.trim()) {
      toast({ title: '请先填写回答', variant: 'destructive' })
      return
    }
    setOptimizing(card.id)
    try {
      const result = await api.optimizeFlashcardAnswer({
        question: card.question,
        answer: card.answer,
        jd_reference: card.jd_reference || undefined,
      })
      setOptimizedAnswer(result.optimized_answer)
      setShowOptimized(card.id)
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'AI 优化失败'
      toast({ title: '优化失败', description: msg, variant: 'destructive' })
    } finally {
      setOptimizing(null)
    }
  }

  const handleAcceptOptimized = async (cardId: string, answer: string) => {
    try {
      await api.updateFlashcard({ id: cardId, optimized_answer: answer })
      toast({ title: '已采纳优化回答' })
      setShowOptimized(null)
      setOptimizedAnswer('')
      await loadCards()
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '保存失败'
      toast({ title: '保存失败', description: msg, variant: 'destructive' })
    }
  }

  const handleReview = async (quality: number) => {
    if (reviewIndex >= dueCards.length) return
    setReviewing(true)
    try {
      await api.submitFlashcardReview({
        flashcard_id: dueCards[reviewIndex].id,
        quality,
      })
      setShowAnswer(false)
      if (reviewIndex + 1 >= dueCards.length) {
        toast({ title: '复习完成！', description: '所有到期卡片已复习' })
        setMode('cards')
        await loadCards()
        await loadDueCards()
        setReviewIndex(0)
      } else {
        setReviewIndex(prev => prev + 1)
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '提交失败'
      toast({ title: '提交失败', description: msg, variant: 'destructive' })
    } finally {
      setReviewing(false)
    }
  }

  const startReview = () => {
    setReviewIndex(0)
    setShowAnswer(false)
    setMode('review')
  }

  const openEditForm = (card: Flashcard) => {
    setEditingCard(card)
    setFormQuestion(card.question)
    setFormAnswer(card.answer)
    setFormTags(card.tags.join(', '))
    setFormJd(card.jd_reference || '')
    setShowCreateForm(true)
  }

  const getIntervalText = (card: Flashcard, quality: number) => {
    if (quality < 3) return '1天'
    const reps = card.repetitions + 1
    if (reps === 1) return '1天'
    if (reps === 2) return '6天'
    const newInterval = Math.round(card.interval * card.ease_factor)
    return `${newInterval}天`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 顶部操作栏 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <Button
              size="sm"
              variant={mode === 'cards' ? 'default' : 'ghost'}
              onClick={() => setMode('cards')}
              className="text-xs h-7"
            >
              <Layers className="h-3 w-3 mr-1" />
              卡片
            </Button>
            <Button
              size="sm"
              variant={mode === 'review' ? 'default' : 'ghost'}
              onClick={startReview}
              className="text-xs h-7"
            >
              <Brain className="h-3 w-3 mr-1" />
              复习
              {dueCards.length > 0 && (
                <Badge variant="destructive" className="ml-1 h-4 text-[10px] px-1">
                  {dueCards.length}
                </Badge>
              )}
            </Button>
            <Button
              size="sm"
              variant={mode === 'stats' ? 'default' : 'ghost'}
              onClick={() => setMode('stats')}
              className="text-xs h-7"
            >
              <TrendingUp className="h-3 w-3 mr-1" />
              统计
            </Button>
          </div>
        </div>
        <Button size="sm" onClick={() => { resetForm(); setShowCreateForm(true) }} className="gap-1">
          <Plus className="h-4 w-4" />
          新建卡片
        </Button>
      </div>

      {/* 卡片列表模式 */}
      {mode === 'cards' && (
        <CardListView
          cards={cards}
          allTags={allTags}
          filterTag={filterTag}
          setFilterTag={setFilterTag}
          openEditForm={openEditForm}
          handleDelete={handleDelete}
          handleOptimize={handleOptimize}
          optimizing={optimizing}
          showOptimized={showOptimized}
          optimizedAnswer={optimizedAnswer}
          handleAcceptOptimized={handleAcceptOptimized}
          setShowOptimized={setShowOptimized}
          setOptimizedAnswer={setOptimizedAnswer}
        />
      )}

      {/* 复习模式 */}
      {mode === 'review' && (
        <ReviewView
          dueCards={dueCards}
          reviewIndex={reviewIndex}
          showAnswer={showAnswer}
          setShowAnswer={setShowAnswer}
          reviewing={reviewing}
          handleReview={handleReview}
          getIntervalText={getIntervalText}
        />
      )}

      {/* 统计模式 */}
      {mode === 'stats' && <StatsView cards={cards} dueCards={dueCards} />}

      {/* 新建/编辑对话框 */}
      {showCreateForm && (
        <CreateEditDialog
          editingCard={editingCard}
          formQuestion={formQuestion}
          setFormQuestion={setFormQuestion}
          formAnswer={formAnswer}
          setFormAnswer={setFormAnswer}
          formTags={formTags}
          setFormTags={setFormTags}
          formJd={formJd}
          setFormJd={setFormJd}
          saving={saving}
          handleSaveCard={handleSaveCard}
          onClose={() => { setShowCreateForm(false); resetForm() }}
        />
      )}
    </div>
  )
}

// ===== 卡片列表子组件 =====
function CardListView({
  cards, allTags, filterTag, setFilterTag,
  openEditForm, handleDelete, handleOptimize,
  optimizing, showOptimized, optimizedAnswer,
  handleAcceptOptimized, setShowOptimized, setOptimizedAnswer,
}: {
  cards: Flashcard[]
  allTags: string[]
  filterTag: string | null
  setFilterTag: (tag: string | null) => void
  openEditForm: (card: Flashcard) => void
  handleDelete: (id: string) => void
  handleOptimize: (card: Flashcard) => void
  optimizing: string | null
  showOptimized: string | null
  optimizedAnswer: string
  handleAcceptOptimized: (cardId: string, answer: string) => void
  setShowOptimized: (id: string | null) => void
  setOptimizedAnswer: (s: string) => void
}) {
  return (
    <div className="space-y-4">
      {allTags.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <Badge
            variant={filterTag === null ? 'default' : 'outline'}
            className="cursor-pointer text-xs"
            onClick={() => setFilterTag(null)}
          >
            全部
          </Badge>
          {allTags.map(tag => (
            <Badge
              key={tag}
              variant={filterTag === tag ? 'default' : 'outline'}
              className="cursor-pointer text-xs"
              onClick={() => setFilterTag(filterTag === tag ? null : tag)}
            >
              <Tag className="h-2.5 w-2.5 mr-1" />
              {tag}
            </Badge>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {cards.length === 0 ? (
          <Card className="p-8 text-center">
            <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-40" />
            <p className="text-sm text-muted-foreground">
              还没有记忆卡片，点击「新建卡片」开始添加面试问题吧！
            </p>
          </Card>
        ) : (
          cards.map(card => (
            <Card key={card.id} className="overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{card.question}</p>
                    {card.tags.length > 0 && (
                      <div className="flex gap-1 mt-1.5">
                        {card.tags.map(tag => (
                          <Badge key={tag} variant="secondary" className="text-[10px] h-5">{tag}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEditForm(card)}>
                      <Edit3 className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:text-red-600" onClick={() => handleDelete(card.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {card.answer && (
                  <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">回答</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-xs gap-1"
                        onClick={() => handleOptimize(card)}
                        disabled={optimizing === card.id}
                      >
                        {optimizing === card.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Sparkles className="h-3 w-3" />
                        )}
                        AI 优化
                      </Button>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">
                      {card.optimized_answer || card.answer}
                    </p>
                  </div>
                )}

                {showOptimized === card.id && optimizedAnswer && (
                  <div className="mt-3 border rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-950 border-b">
                      <span className="text-xs font-medium text-green-700 dark:text-green-300">AI 优化版本</span>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => handleAcceptOptimized(card.id, optimizedAnswer)}>
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          采纳
                        </Button>
                        <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => { setShowOptimized(null); setOptimizedAnswer('') }}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="text-sm text-green-800 dark:text-green-200 whitespace-pre-wrap">{optimizedAnswer}</p>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

// ===== 复习子组件 =====
function ReviewView({
  dueCards, reviewIndex, showAnswer, setShowAnswer, reviewing, handleReview, getIntervalText,
}: {
  dueCards: Flashcard[]
  reviewIndex: number
  showAnswer: boolean
  setShowAnswer: (v: boolean) => void
  reviewing: boolean
  handleReview: (quality: number) => void
  getIntervalText: (card: Flashcard, quality: number) => string
}) {
  if (dueCards.length === 0) {
    return (
      <Card className="p-8 text-center">
        <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500 opacity-60" />
        <p className="text-lg font-medium">今日复习已完成！</p>
        <p className="text-sm text-muted-foreground mt-1">所有卡片都已复习，下次复习时间会根据记忆曲线自动安排。</p>
      </Card>
    )
  }

  const currentCard = dueCards[reviewIndex]
  if (!currentCard) return null

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          剩余 {dueCards.length - reviewIndex} 张待复习
        </span>
        <span className="text-sm font-medium">
          {reviewIndex + 1} / {dueCards.length}
        </span>
      </div>
      <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full">
        <div
          className="h-full bg-blue-500 rounded-full transition-all"
          style={{ width: `${(reviewIndex / dueCards.length) * 100}%` }}
        />
      </div>

      <Card
        className="cursor-pointer hover:shadow-lg transition-all min-h-[300px] flex flex-col justify-center"
        onClick={() => !showAnswer && setShowAnswer(true)}
      >
        <CardContent className="p-8 text-center">
          {!showAnswer ? (
            <div>
              <Brain className="h-8 w-8 mx-auto mb-4 text-blue-500 opacity-60" />
              <p className="text-lg font-medium mb-4">{currentCard.question}</p>
              {currentCard.tags.length > 0 && (
                <div className="flex gap-1 justify-center mb-4">
                  {currentCard.tags.map((tag: string) => (
                    <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                  ))}
                </div>
              )}
              <p className="text-sm text-muted-foreground">点击卡片查看答案</p>
            </div>
          ) : (
            <div>
              <p className="text-sm text-muted-foreground mb-2">答案：</p>
              <p className="text-base whitespace-pre-wrap text-left">
                {currentCard.optimized_answer || currentCard.answer}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {showAnswer && (
        <div className="space-y-2">
          <p className="text-sm text-center text-muted-foreground">你对这个回答的记忆程度如何？</p>
          <div className="grid grid-cols-4 gap-2">
            <Button
              variant="outline"
              className="flex flex-col h-auto py-3 border-red-200 hover:bg-red-50 hover:border-red-400"
              onClick={() => handleReview(0)}
              disabled={reviewing}
            >
              <span className="text-xs font-medium text-red-600">完全忘了</span>
              <span className="text-[10px] text-muted-foreground">重新学习</span>
            </Button>
            <Button
              variant="outline"
              className="flex flex-col h-auto py-3 border-orange-200 hover:bg-orange-50 hover:border-orange-400"
              onClick={() => handleReview(3)}
              disabled={reviewing}
            >
              <span className="text-xs font-medium text-orange-600">困难</span>
              <span className="text-[10px] text-muted-foreground">1天后</span>
            </Button>
            <Button
              variant="outline"
              className="flex flex-col h-auto py-3 border-blue-200 hover:bg-blue-50 hover:border-blue-400"
              onClick={() => handleReview(4)}
              disabled={reviewing}
            >
              <span className="text-xs font-medium text-blue-600">一般</span>
              <span className="text-[10px] text-muted-foreground">{getIntervalText(currentCard, 4)}</span>
            </Button>
            <Button
              variant="outline"
              className="flex flex-col h-auto py-3 border-green-200 hover:bg-green-50 hover:border-green-400"
              onClick={() => handleReview(5)}
              disabled={reviewing}
            >
              <span className="text-xs font-medium text-green-600">简单</span>
              <span className="text-[10px] text-muted-foreground">{getIntervalText(currentCard, 5)}</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ===== 统计子组件 =====
function StatsView({ cards, dueCards }: { cards: Flashcard[]; dueCards: Flashcard[] }) {
  const now = new Date()
  const days = [0, 1, 2, 3, 7, 14, 30]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground">总卡片数</p>
            <p className="text-2xl font-bold">{cards.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground">待复习</p>
            <p className="text-2xl font-bold text-orange-600">{dueCards.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground">已掌握</p>
            <p className="text-2xl font-bold text-green-600">
              {cards.filter(c => c.repetitions >= 3).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground">总复习次数</p>
            <p className="text-2xl font-bold">
              {cards.reduce((sum, c) => sum + c.review_count, 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            记忆强度分布
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { label: '新卡片', count: cards.filter(c => c.repetitions === 0).length, color: 'bg-gray-400' },
              { label: '学习中', count: cards.filter(c => c.repetitions > 0 && c.repetitions < 3).length, color: 'bg-orange-400' },
              { label: '已掌握', count: cards.filter(c => c.repetitions >= 3 && c.ease_factor < 2.5).length, color: 'bg-blue-400' },
              { label: '熟练', count: cards.filter(c => c.repetitions >= 3 && c.ease_factor >= 2.5).length, color: 'bg-green-400' },
            ].map(({ label, count, color }) => {
              const pct = cards.length > 0 ? (count / cards.length) * 100 : 0
              return (
                <div key={label} className="flex items-center gap-3">
                  <span className="text-xs w-16 text-muted-foreground">{label}</span>
                  <div className="flex-1 h-5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs w-8 text-right font-medium">{count}</span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            未来复习计划
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {days.map(d => {
              const target = new Date(now)
              target.setDate(target.getDate() + d)
              const targetStr = target.toISOString().split('T')[0]
              const count = cards.filter(c => {
                const reviewDate = new Date(c.next_review_at).toISOString().split('T')[0]
                return reviewDate === targetStr
              }).length
              const label = d === 0 ? '今天' : d === 1 ? '明天' : `${d}天后`
              return (
                <div key={d} className="flex items-center justify-between py-1">
                  <span className="text-sm text-muted-foreground">{label}</span>
                  <Badge variant={count > 0 ? 'default' : 'secondary'} className="text-xs">
                    {count} 张
                  </Badge>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ===== 创建/编辑对话框 =====
function CreateEditDialog({
  editingCard, formQuestion, setFormQuestion, formAnswer, setFormAnswer,
  formTags, setFormTags, formJd, setFormJd, saving, handleSaveCard, onClose,
}: {
  editingCard: Flashcard | null
  formQuestion: string
  setFormQuestion: (v: string) => void
  formAnswer: string
  setFormAnswer: (v: string) => void
  formTags: string
  setFormTags: (v: string) => void
  formJd: string
  setFormJd: (v: string) => void
  saving: boolean
  handleSaveCard: () => void
  onClose: () => void
}) {
  const { toast } = useToast()
  const [aiOptimizing, setAiOptimizing] = useState(false)
  const [aiResult, setAiResult] = useState<string | null>(null)
  const [originalAnswer, setOriginalAnswer] = useState('')

  const handleAiOptimize = async () => {
    if (!formAnswer.trim()) {
      toast({ title: '请先填写回答再优化', variant: 'destructive' })
      return
    }
    if (!formQuestion.trim()) {
      toast({ title: '请先填写面试问题', variant: 'destructive' })
      return
    }
    setOriginalAnswer(formAnswer)
    setAiOptimizing(true)
    try {
      const result = await api.optimizeFlashcardAnswer({
        question: formQuestion,
        answer: formAnswer,
        jd_reference: formJd || undefined,
      })
      setAiResult(result.optimized_answer)
      setFormAnswer(result.optimized_answer)
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'AI 优化失败'
      toast({ title: '优化失败', description: msg, variant: 'destructive' })
    } finally {
      setAiOptimizing(false)
    }
  }

  const handleKeep = () => {
    // 保留优化结果，已经在 formAnswer 中了
    setAiResult(null)
    toast({ title: '已保留 AI 优化回答' })
  }

  const handleDiscard = () => {
    // 恢复原始回答
    setFormAnswer(originalAnswer)
    setAiResult(null)
  }

  const handleRegenerate = () => {
    // 恢复原始回答后重新生成
    setFormAnswer(originalAnswer)
    setAiResult(null)
    // 延迟触发重新优化，让状态更新
    setTimeout(() => {
      handleAiOptimize()
    }, 100)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="text-lg">
            {editingCard ? '编辑卡片' : '新建记忆卡片'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">面试问题 *</label>
            <Textarea
              placeholder="如：请介绍一下你自己"
              value={formQuestion}
              onChange={(e) => setFormQuestion(e.target.value)}
              className="mt-1"
              rows={2}
            />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">你的回答</label>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 text-xs gap-1 text-blue-600 hover:text-blue-700"
                onClick={handleAiOptimize}
                disabled={aiOptimizing || !formAnswer.trim()}
              >
                {aiOptimizing ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="h-3 w-3" />
                )}
                {aiOptimizing ? '优化中...' : 'AI 优化'}
              </Button>
            </div>
            <Textarea
              placeholder="写下你的回答..."
              value={formAnswer}
              onChange={(e) => { setFormAnswer(e.target.value); if (aiResult) setAiResult(null) }}
              className={`mt-1 ${aiResult ? 'border-green-300 bg-green-50 dark:bg-green-950/30' : ''}`}
              rows={5}
            />
            {/* AI 优化操作栏 */}
            {aiResult && (
              <div className="flex items-center justify-between mt-2 p-2 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                <span className="text-xs text-green-700 dark:text-green-300 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  AI 已优化
                </span>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" className="h-6 text-xs text-green-700 hover:bg-green-100" onClick={handleKeep}>
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    保留
                  </Button>
                  <Button size="sm" variant="ghost" className="h-6 text-xs text-red-600 hover:bg-red-50" onClick={handleDiscard}>
                    <X className="h-3 w-3 mr-1" />
                    删除
                  </Button>
                  <Button size="sm" variant="ghost" className="h-6 text-xs text-blue-600 hover:bg-blue-50" onClick={handleRegenerate}>
                    <Sparkles className="h-3 w-3 mr-1" />
                    重新生成
                  </Button>
                </div>
              </div>
            )}
          </div>
          <div>
            <label className="text-sm font-medium">标签（逗号分隔）</label>
            <Input
              placeholder="如：产品经理, 行为面试, 自我介绍"
              value={formTags}
              onChange={(e) => setFormTags(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">参考 JD（可选，用于 AI 优化）</label>
            <Textarea
              placeholder="粘贴目标岗位的 JD 内容..."
              value={formJd}
              onChange={(e) => setFormJd(e.target.value)}
              className="mt-1"
              rows={3}
            />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="ghost" onClick={onClose}>
              取消
            </Button>
            <Button onClick={handleSaveCard} disabled={!formQuestion.trim() || saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              {editingCard ? '保存修改' : '创建卡片'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
