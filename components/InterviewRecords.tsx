'use client'

import { useState, useEffect, useMemo } from 'react'
import { api } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Trash2,
  MapPin,
  Briefcase,
  Clock,
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

interface InterviewRecord {
  id: string
  title: string
  company: string
  position: string
  interview_date: string
  content: string
  created_at: string
}

// 面试记录的颜色方案（苹果日历风格）
const EVENT_COLORS = [
  { bg: 'bg-blue-100', border: 'border-l-blue-500', text: 'text-blue-700', dot: 'bg-blue-500' },
  { bg: 'bg-red-100', border: 'border-l-red-500', text: 'text-red-700', dot: 'bg-red-500' },
  { bg: 'bg-green-100', border: 'border-l-green-500', text: 'text-green-700', dot: 'bg-green-500' },
  { bg: 'bg-purple-100', border: 'border-l-purple-500', text: 'text-purple-700', dot: 'bg-purple-500' },
  { bg: 'bg-orange-100', border: 'border-l-orange-500', text: 'text-orange-700', dot: 'bg-orange-500' },
  { bg: 'bg-pink-100', border: 'border-l-pink-500', text: 'text-pink-700', dot: 'bg-pink-500' },
  { bg: 'bg-teal-100', border: 'border-l-teal-500', text: 'text-teal-700', dot: 'bg-teal-500' },
]

function getColorForCompany(company: string, index: number) {
  if (!company) return EVENT_COLORS[index % EVENT_COLORS.length]
  // 根据公司名 hash 分配固定颜色
  let hash = 0
  for (let i = 0; i < company.length; i++) {
    hash = company.charCodeAt(i) + ((hash << 5) - hash)
  }
  return EVENT_COLORS[Math.abs(hash) % EVENT_COLORS.length]
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

function formatDate(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']
const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

export function InterviewRecords({ userId }: { userId: string }) {
  const [records, setRecords] = useState<InterviewRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [showDetail, setShowDetail] = useState<InterviewRecord | null>(null)
  const { toast } = useToast()

  // 表单状态
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [position, setPosition] = useState('')
  const [company, setCompany] = useState('')
  const [date, setDate] = useState('')

  void userId

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  useEffect(() => {
    fetchRecords()
  }, [])

  const fetchRecords = async () => {
    try {
      setLoading(true)
      const data = await api.getInterviewRecords()
      setRecords((data || []) as unknown as InterviewRecord[])
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '获取失败'
      console.error('获取面试记录失败:', error)
      toast({ title: '获取面试记录失败', description: message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  // 按日期分组记录
  const recordsByDate = useMemo(() => {
    const map: Record<string, InterviewRecord[]> = {}
    records.forEach((r) => {
      const d = r.interview_date
      if (d) {
        if (!map[d]) map[d] = []
        map[d].push(r)
      }
    })
    return map
  }, [records])

  // 生成日历网格
  const calendarDays = useMemo(() => {
    const daysInMonth = getDaysInMonth(year, month)
    const firstDay = getFirstDayOfMonth(year, month)
    const days: { day: number; isCurrentMonth: boolean; dateStr: string }[] = []

    // 上月填充
    const prevMonthDays = getDaysInMonth(year, month - 1)
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = prevMonthDays - i
      const m = month === 0 ? 11 : month - 1
      const y = month === 0 ? year - 1 : year
      days.push({ day: d, isCurrentMonth: false, dateStr: formatDate(y, m, d) })
    }

    // 当月
    for (let d = 1; d <= daysInMonth; d++) {
      days.push({ day: d, isCurrentMonth: true, dateStr: formatDate(year, month, d) })
    }

    // 下月填充（补满 6 行）
    const remaining = 42 - days.length
    for (let d = 1; d <= remaining; d++) {
      const m = month === 11 ? 0 : month + 1
      const y = month === 11 ? year + 1 : year
      days.push({ day: d, isCurrentMonth: false, dateStr: formatDate(y, m, d) })
    }

    return days
  }, [year, month])

  const today = formatDate(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())

  const goToPrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const handleDayClick = (dateStr: string) => {
    setSelectedDate(dateStr)
    // 如果该日期没有记录，直接打开新增表单
    if (!recordsByDate[dateStr] || recordsByDate[dateStr].length === 0) {
      openFormForDate(dateStr)
    }
  }

  const openFormForDate = (dateStr: string) => {
    setDate(dateStr)
    setTitle('')
    setContent('')
    setPosition('')
    setCompany('')
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      toast({ title: '请填写标题', variant: 'destructive' })
      return
    }
    try {
      await api.createInterviewRecord({
        title,
        content,
        position,
        company,
        interview_date: date || undefined,
      })
      toast({ title: '面试记录已添加' })
      setShowForm(false)
      setSelectedDate(null)
      fetchRecords()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '保存失败'
      toast({ title: '保存失败', description: message, variant: 'destructive' })
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await api.deleteInterviewRecord(id)
      toast({ title: '记录已删除' })
      setShowDetail(null)
      setSelectedDate(null)
      fetchRecords()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '删除失败'
      toast({ title: '删除失败', description: message, variant: 'destructive' })
    }
  }

  // 选中日期的记录
  const selectedRecords = selectedDate ? (recordsByDate[selectedDate] || []) : []

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 日历头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold">
            {year}年 {MONTHS[month]}
          </h2>
          <Button variant="outline" size="sm" onClick={goToToday} className="text-xs">
            今天
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={goToPrevMonth}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={goToNextMonth}>
            <ChevronRight className="h-5 w-5" />
          </Button>
          <Button onClick={() => openFormForDate(today)} size="sm" className="ml-3">
            <Plus className="mr-1 h-4 w-4" />
            新增记录
          </Button>
        </div>
      </div>

      {/* 日历主体 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border shadow-sm overflow-hidden">
        {/* 星期头 */}
        <div className="grid grid-cols-7 border-b">
          {WEEKDAYS.map((day, i) => (
            <div
              key={day}
              className={`py-3 text-center text-xs font-medium ${
                i === 0 || i === 6 ? 'text-red-400' : 'text-muted-foreground'
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* 日期格子 */}
        <div className="grid grid-cols-7">
          {calendarDays.map((cell, idx) => {
            const dayRecords = recordsByDate[cell.dateStr] || []
            const isToday = cell.dateStr === today
            const isSelected = cell.dateStr === selectedDate
            const isWeekend = idx % 7 === 0 || idx % 7 === 6

            return (
              <div
                key={idx}
                onClick={() => handleDayClick(cell.dateStr)}
                className={`
                  relative min-h-[100px] p-1.5 border-b border-r cursor-pointer transition-colors
                  ${!cell.isCurrentMonth ? 'bg-gray-50 dark:bg-gray-900' : 'hover:bg-blue-50/50 dark:hover:bg-blue-950/20'}
                  ${isSelected ? 'bg-blue-50 dark:bg-blue-950/30 ring-2 ring-blue-500 ring-inset' : ''}
                `}
              >
                {/* 日期数字 */}
                <div className="flex items-center justify-center mb-1">
                  <span
                    className={`
                      w-7 h-7 flex items-center justify-center rounded-full text-sm
                      ${isToday ? 'bg-red-500 text-white font-bold' : ''}
                      ${!isToday && !cell.isCurrentMonth ? 'text-gray-300 dark:text-gray-600' : ''}
                      ${!isToday && cell.isCurrentMonth && isWeekend ? 'text-red-400' : ''}
                      ${!isToday && cell.isCurrentMonth && !isWeekend ? 'text-gray-700 dark:text-gray-300' : ''}
                    `}
                  >
                    {cell.day}
                  </span>
                </div>

                {/* 面试事件 */}
                <div className="space-y-0.5">
                  {dayRecords.slice(0, 3).map((record, rIdx) => {
                    const color = getColorForCompany(record.company, rIdx)
                    return (
                      <div
                        key={record.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          setShowDetail(record)
                        }}
                        className={`
                          ${color.bg} ${color.border} ${color.text}
                          border-l-2 rounded-r px-1.5 py-0.5 text-[10px] leading-tight
                          truncate cursor-pointer hover:opacity-80 transition-opacity
                        `}
                        title={`${record.company} - ${record.title}`}
                      >
                        {record.company || record.title}
                      </div>
                    )
                  })}
                  {dayRecords.length > 3 && (
                    <div className="text-[10px] text-muted-foreground text-center">
                      +{dayRecords.length - 3} 更多
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 选中日期的记录列表（日历下方） */}
      {selectedDate && selectedRecords.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-base">
              {selectedDate} 的面试
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({selectedRecords.length} 场)
              </span>
            </h3>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => openFormForDate(selectedDate)}>
                <Plus className="mr-1 h-3 w-3" />
                添加
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedDate(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {selectedRecords.map((record, idx) => {
              const color = getColorForCompany(record.company, idx)
              return (
                <div
                  key={record.id}
                  className={`${color.bg} ${color.border} border-l-4 rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow`}
                  onClick={() => setShowDetail(record)}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1.5">
                      <h4 className={`font-semibold ${color.text}`}>{record.title}</h4>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        {record.company && (
                          <span className="flex items-center gap-1">
                            <Briefcase className="h-3 w-3" />
                            {record.company}
                          </span>
                        )}
                        {record.position && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {record.position}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {record.interview_date}
                        </span>
                      </div>
                      {record.content && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                          {record.content}
                        </p>
                      )}
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="shrink-0 h-8 w-8 text-red-400 hover:text-red-600"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(record.id)
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 新增面试记录弹窗 */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>添加面试记录</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="title">面试标题 *</Label>
              <Input
                id="title"
                placeholder="如：字节跳动一面"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company">公司</Label>
                <Input
                  id="company"
                  placeholder="公司名称"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="position">岗位</Label>
                <Input
                  id="position"
                  placeholder="应聘岗位"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">面试日期</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">面试详情 / 复盘笔记</Label>
              <Textarea
                id="content"
                placeholder="记录面试问题、自己的回答、面试官反馈等..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={5}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                取消
              </Button>
              <Button type="submit">保存记录</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* 面试详情弹窗 */}
      <Dialog open={!!showDetail} onOpenChange={(open) => !open && setShowDetail(null)}>
        <DialogContent className="sm:max-w-[550px]">
          {showDetail && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${getColorForCompany(showDetail.company, 0).dot}`} />
                  {showDetail.title}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="flex flex-wrap gap-4 text-sm">
                  {showDetail.company && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Briefcase className="h-4 w-4" />
                      <span>{showDetail.company}</span>
                    </div>
                  )}
                  {showDetail.position && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{showDetail.position}</span>
                    </div>
                  )}
                  {showDetail.interview_date && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{showDetail.interview_date}</span>
                    </div>
                  )}
                </div>

                {showDetail.content && (
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{showDetail.content}</p>
                  </div>
                )}

                <div className="flex justify-between pt-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(showDetail.id)}
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    删除记录
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowDetail(null)}>
                    关闭
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
