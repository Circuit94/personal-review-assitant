'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { Calendar as CalendarIcon, History, Plus, Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

export function InterviewRecords({ userId }: { userId: string }) {
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const { toast } = useToast()

  // 表单状态
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [position, setPosition] = useState('')
  const [company, setCompany] = useState('')
  const [date, setDate] = useState('')

  useEffect(() => {
    fetchRecords()
  }, [])

  const fetchRecords = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('interview_records')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setRecords(data || [])
    } catch (error: any) {
      console.error('获取面试记录失败:', error)
      toast({
        title: '获取面试记录失败',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { error } = await supabase.from('interview_records').insert({
        user_id: userId,
        title,
        content,
        position,
        company,
        interview_date: date || null,
      })

      if (error) throw error

      toast({ title: '记录已添加' })
      setOpen(false)
      fetchRecords()
      // 重置表单
      setTitle('')
      setContent('')
      setPosition('')
      setCompany('')
      setDate('')
    } catch (error: any) {
      toast({
        title: '保存失败',
        description: error.message,
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('interview_records').delete().eq('id', id)
      if (error) throw error
      toast({ title: '记录已删除' })
      fetchRecords()
    } catch (error: any) {
      toast({
        title: '删除失败',
        description: error.message,
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">面试记录</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              新增面试记录
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>添加面试记录</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="title" className="text-right">标题</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="company" className="text-right">公司</Label>
                <Input id="company" value={company} onChange={(e) => setCompany(e.target.value)} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="position" className="text-right">岗位</Label>
                <Input id="position" value={position} onChange={(e) => setPosition(e.target.value)} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="date" className="text-right">日期</Label>
                <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="content" className="text-right pt-2">详情</Label>
                <Textarea id="content" value={content} onChange={(e) => setContent(e.target.value)} required className="col-span-3" rows={5} />
              </div>
              <div className="flex justify-end pt-4">
                <Button type="submit">保存记录</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {records.map((record) => (
          <Card key={record.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold">{record.title}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {record.company} | {record.position} | {record.interview_date || '未记录日期'}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(record.id)}
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{record.content}</p>
            </CardContent>
          </Card>
        ))}

        {records.length === 0 && !loading && (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <History className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-muted-foreground">暂无面试记录，开始记录您的面试经历吧</p>
          </div>
        )}
      </div>
    </div>
  )
}
