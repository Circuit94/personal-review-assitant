'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'

interface InterviewNote {
  id: string
  company: string
  position: string
  notes: string
  created_at: string
}

export function InterviewNotes() {
  const supabase = createClient()
  const [notes, setNotes] = useState<InterviewNote[]>([])
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    company: '',
    position: '',
    notes: '',
  })

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)
      if (user) {
        fetchNotes(user.id)
      }
    }
    getUser()
  }, [supabase])

  const fetchNotes = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('interview_notes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setNotes(data || [])
    } catch (error) {
      console.error('获取面试记录失败:', error)
    }
  }

  const handleAddNote = async () => {
    if (!formData.company || !formData.position || !formData.notes || !user) {
      toast.error('请填写所有字段')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.from('interview_notes').insert({
        user_id: user.id,
        company: formData.company,
        position: formData.position,
        notes: formData.notes,
      })

      if (error) throw error

      toast.success('面试记录已保存')
      setFormData({ company: '', position: '', notes: '' })
      setShowForm(false)
      fetchNotes(user.id)
    } catch (error) {
      console.error('保存失败:', error)
      toast.error('保存失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('interview_notes')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast.success('记录已删除')
      if (user) {
        fetchNotes(user.id)
      }
    } catch (error) {
      console.error('删除失败:', error)
      toast.error('删除失败，请重试')
    }
  }

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">面试记录</h2>
        <Button
          onClick={() => setShowForm(!showForm)}
          size="sm"
        >
          {showForm ? '取消' : '添加记录'}
        </Button>
      </div>

      {showForm && (
        <div className="mb-6 p-4 bg-slate-50 rounded-lg space-y-3">
          <Input
            placeholder="公司名称"
            value={formData.company}
            onChange={(e) =>
              setFormData({ ...formData, company: e.target.value })
            }
          />
          <Input
            placeholder="岗位名称"
            value={formData.position}
            onChange={(e) =>
              setFormData({ ...formData, position: e.target.value })
            }
          />
          <Textarea
            placeholder="面试记录（你遇到的问题、如何回答等）"
            value={formData.notes}
            onChange={(e) =>
              setFormData({ ...formData, notes: e.target.value })
            }
            rows={4}
          />
          <Button
            onClick={handleAddNote}
            disabled={loading}
            className="w-full"
          >
            {loading ? '保存中...' : '保存记录'}
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {notes.length === 0 ? (
          <p className="text-sm text-slate-500">还没有面试记录</p>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              className="p-4 border border-slate-200 rounded-lg"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-semibold text-slate-900">
                    {note.company} - {note.position}
                  </p>
                  <p className="text-xs text-slate-500">
                    {new Date(note.created_at).toLocaleDateString('zh-CN')}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(note.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">
                {note.notes}
              </p>
            </div>
          ))
        )}
      </div>
    </Card>
  )
}
