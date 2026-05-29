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
  Calendar,
  Columns3,
  GripVertical,
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

interface InterviewRecord {
  id: string
  title: string
  company: string
  position: string
  interview_date: string
  stage: string
  content: string
  created_at: string
}

// 面试流程阶段定义
const STAGES = [
  { key: 'applied', label: '已投递', color: 'bg-gray-100 border-gray-300 text-gray-700', badge: 'bg-gray-500' },
  { key: 'hr_screen', label: 'HR面', color: 'bg-blue-50 border-blue-300 text-blue-700', badge: 'bg-blue-500' },
  { key: 'first_round', label: '一面', color: 'bg-indigo-50 border-indigo-300 text-indigo-700', badge: 'bg-indigo-500' },
  { key: 'second_round', label: '二面', color: 'bg-purple-50 border-purple-300 text-purple-700', badge: 'bg-purple-500' },
  { key: 'final_round', label: '终面', color: 'bg-amber-50 border-amber-300 text-amber-700', badge: 'bg-amber-500' },
  { key: 'offer', label: 'Offer', color: 'bg-green-50 border-green-300 text-green-700', badge: 'bg-green-500' },
  { key: 'rejected', label: '已拒', color: 'bg-red-50 border-red-300 text-red-700', badge: 'bg-red-500' },
]

function getStageInfo(stage: string) {
  return STAGES.find((s) => s.key === stage) || STAGES[0]
}

// 结构化复盘模板
const REVIEW_TEMPLATE = `## 面试问题记录

### Q1: 
- 我的回答：
- 面试官反应：👍/😐/👎
- 改进点：

### Q2: 
- 我的回答：
- 面试官反应：👍/😐/👎
- 改进点：

### Q3: 
- 我的回答：
- 面试官反应：👍/😐/👎
- 改进点：

## 整体自评

- 自信程度：⭐⭐⭐☆☆ (3/5)
- 表达流畅度：⭐⭐⭐☆☆ (3/5)
- 技术深度：⭐⭐⭐☆☆ (3/5)
- STAR法则使用：是/否

## 面试官信号

- 面试时长：约 __ 分钟
- 面试官态度：积极/中性/消极
- 是否介绍团队/项目：是/否
- 是否问期望薪资：是/否

## 待改进 & 下次准备

- [ ] 
- [ ] 
- [ ] 
`

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

type ViewMode = 'calendar' | 'kanban'

export function InterviewRecords({ userId }: { userId: string }) {
  const [records, setRecords] = useState<InterviewRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('kanban')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [showDetail, setShowDetail] = useState<InterviewRecord | null>(null)
  const [editingRecord, setEditingRecord] = useState<InterviewRecord | null>(null)
  const { toast } = useToast()

  // 表单状态
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [position, setPosition] = useState('')
  const [company, setCompany] = useState('')
  const [date, setDate] = useState('')
  const [stage, setStage] = useState('applied')

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

  // 按阶段分组记录
  const recordsByStage = useMemo(() => {
    const map: Record<string, InterviewRecord[]> = {}
    STAGES.forEach((s) => { map[s.key] = [] })
    records.forEach((r) => {
      const stageKey = r.stage || 'applied'
      if (!map[stageKey]) map[stageKey] = []
      map[stageKey].push(r)
    })
    return map
  }, [records])

  // 生成日历网格
  const calendarDays = useMemo(() => {
    const daysInMonth = getDaysInMonth(year, month)
    const firstDay = getFirstDayOfMonth(year, month)
    const days: { day: number; isCurrentMonth: boolean; dateStr: string }[] = []

    const prevMonthDays = getDaysInMonth(year, month - 1)
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = prevMonthDays - i
      const m = month === 0 ? 11 : month - 1
      const y = month === 0 ? year - 1 : year
      days.push({ day: d, isCurrentMonth: false, dateStr: formatDate(y, m, d) })
    }

    for (let d = 1; d <= daysInMonth; d++) {
      days.push({ day: d, isCurrentMonth: true, dateStr: formatDate(year, month, d) })
    }

    const remaining = 42 - days.length
    for (let d = 1; d <= remaining; d++) {
      const m = month === 11 ? 0 : month + 1
      const y = month === 11 ? year + 1 : year
      days.push({ day: d, isCurrentMonth: false, dateStr: formatDate(y, m, d) })
    }

    return days
  }, [year, month])

  const today = formatDate(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())

  const goToPrevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const goToNextMonth = () => setCurrentDate(new Date(year, month + 1, 1))
  const goToToday = () => setCurrentDate(new Date())

  const handleDayClick = (dateStr: string) => {
    setSelectedDate(dateStr)
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
    setStage('applied')
    setEditingRecord(null)
    setShowForm(true)
  }

  const openFormForStage = (stageKey: string) => {
    setDate(today)
    setTitle('')
    setContent('')
    setPosition('')
    setCompany('')
    setStage(stageKey)
    setEditingRecord(null)
    setShowForm(true)
  }

  const openEditForm = (record: InterviewRecord) => {
    setEditingRecord(record)
    setTitle(record.title)
    setContent(record.content || '')
    setPosition(record.position || '')
    setCompany(record.company || '')
    setDate(record.interview_date || '')
    setStage(record.stage || 'applied')
    setShowForm(true)
    setShowDetail(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      toast({ title: '请填写标题', variant: 'destructive' })
      return
    }
    try {
      if (editingRecord) {
        await api.updateInterviewRecord({
          id: editingRecord.id,
          title,
          content,
          position,
          company,
          interview_date: date || undefined,
          stage,
        })
        toast({ title: '记录已更新' })
      } else {
        await api.createInterviewRecord({
          title,
          content,
          position,
          company,
          interview_date: date || undefined,
          stage,
        })
        toast({ title: '面试记录已添加' })
      }
      setShowForm(false)
      setSelectedDate(null)
      setEditingRecord(null)
      fetchRecords()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '保存失败'
      toast({ title: '保存失败', description: message, variant: 'destructive' })
    }
  }

  const handleStageChange = async (recordId: string, newStage: string) => {
    try {
      await api.updateInterviewRecord({ id: recordId, stage: newStage })
      fetchRecords()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '更新失败'
      toast({ title: '更新阶段失败', description: message, variant: 'destructive' })
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
      {/* 头部：视图切换 + 操作 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {viewMode === 'calendar' && (
            <>
              <h2 className="text-2xl font-bold">
                {year}年 {MONTHS[month]}
              </h2>
              <Button variant="outline" size="sm" onClick={goToToday} className="text-xs">
                今天
              </Button>
            </>
          )}
          {viewMode === 'kanban' && (
            <h2 className="text-2xl font-bold">面试看板</h2>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* 视图切换 */}
          <div className="flex items-center border rounded-lg p-0.5">
            <Button
              variant={viewMode === 'kanban' ? 'default' : 'ghost'}
              size="sm"
              className="h-7 px-2.5"
              onClick={() => setViewMode('kanban')}
            >
              <Columns3 className="h-4 w-4 mr-1" />
              看板
            </Button>
            <Button
              variant={viewMode === 'calendar' ? 'default' : 'ghost'}
              size="sm"
              className="h-7 px-2.5"
              onClick={() => setViewMode('calendar')}
            >
              <Calendar className="h-4 w-4 mr-1" />
              日历
            </Button>
          </div>

          {viewMode === 'calendar' && (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={goToPrevMonth}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={goToNextMonth}>
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          )}

          <Button onClick={() => openFormForDate(today)} size="sm" className="ml-2">
            <Plus className="mr-1 h-4 w-4" />
            新增记录
          </Button>
        </div>
      </div>

      {/* ==================== 看板视图 ==================== */}
      {viewMode === 'kanban' && (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {STAGES.map((stageInfo) => {
            const stageRecords = recordsByStage[stageInfo.key] || []
            return (
              <div
                key={stageInfo.key}
                className="flex-shrink-0 w-[240px] bg-gray-50 dark:bg-gray-900 rounded-xl border"
              >
                {/* 列头 */}
                <div className="flex items-center justify-between px-3 py-2.5 border-b">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${stageInfo.badge}`} />
                    <span className="text-sm font-medium">{stageInfo.label}</span>
                    <span className="text-xs text-muted-foreground bg-white dark:bg-gray-800 px-1.5 py-0.5 rounded-full">
                      {stageRecords.length}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => openFormForStage(stageInfo.key)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {/* 卡片列表 */}
                <div className="p-2 space-y-2 min-h-[200px] max-h-[calc(100vh-20rem)] overflow-y-auto">
                  {stageRecords.map((record) => {
                    const color = getColorForCompany(record.company, 0)
                    return (
                      <div
                        key={record.id}
                        className="bg-white dark:bg-gray-800 rounded-lg border shadow-sm p-3 cursor-pointer hover:shadow-md transition-shadow group"
                        onClick={() => setShowDetail(record)}
                      >
                        <div className="flex items-start justify-between">
                          <h4 className="text-sm font-medium line-clamp-2">{record.title}</h4>
                          <GripVertical className="h-4 w-4 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                        </div>
                        {record.company && (
                          <div className="flex items-center gap-1 mt-1.5">
                            <div className={`w-2 h-2 rounded-full ${color.dot}`} />
                            <span className="text-xs text-muted-foreground">{record.company}</span>
                          </div>
                        )}
                        {record.position && (
                          <span className="text-xs text-muted-foreground block mt-0.5">{record.position}</span>
                        )}
                        {record.interview_date && (
                          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{record.interview_date}</span>
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {stageRecords.length === 0 && (
                    <div className="flex items-center justify-center h-20 text-xs text-muted-foreground">
                      暂无记录
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ==================== 日历视图 ==================== */}
      {viewMode === 'calendar' && (
        <>
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

          {/* 选中日期的记录列表 */}
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
                          <div className="flex items-center gap-2">
                            <h4 className={`font-semibold ${color.text}`}>{record.title}</h4>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {getStageInfo(record.stage).label}
                            </Badge>
                          </div>
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
                          </div>
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
        </>
      )}

      {/* ==================== 新增/编辑面试记录弹窗 ==================== */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingRecord ? '编辑面试记录' : '添加面试记录'}</DialogTitle>
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
            <div className="grid grid-cols-2 gap-4">
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
                <Label htmlFor="stage">当前阶段</Label>
                <select
                  id="stage"
                  value={stage}
                  onChange={(e) => setStage(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {STAGES.map((s) => (
                    <option key={s.key} value={s.key}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="content">面试详情 / 复盘笔记</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs h-6 text-blue-600"
                  onClick={() => {
                    if (content.trim() && !confirm('使用模板将覆盖当前内容，确定吗？')) return
                    setContent(REVIEW_TEMPLATE)
                  }}
                >
                  📋 使用复盘模板
                </Button>
              </div>
              <Textarea
                id="content"
                placeholder="记录面试问题、自己的回答、面试官反馈等..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={8}
                className="font-mono text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditingRecord(null) }}>
                取消
              </Button>
              <Button type="submit">{editingRecord ? '保存修改' : '保存记录'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ==================== 面试详情弹窗 ==================== */}
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
                <div className="flex flex-wrap gap-3 text-sm">
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
                  <Badge variant="outline" className="text-xs">
                    {getStageInfo(showDetail.stage).label}
                  </Badge>
                </div>

                {/* 阶段快速切换 */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">切换阶段</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {STAGES.map((s) => (
                      <Button
                        key={s.key}
                        size="sm"
                        variant={showDetail.stage === s.key ? 'default' : 'outline'}
                        className="text-xs h-7"
                        onClick={() => handleStageChange(showDetail.id, s.key)}
                      >
                        {s.label}
                      </Button>
                    ))}
                  </div>
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
                    删除
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEditForm(showDetail)}>
                      编辑
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setShowDetail(null)}>
                      关闭
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
