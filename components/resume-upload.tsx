'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Upload, FileText, Trash2 } from 'lucide-react'
import { put, del } from '@vercel/blob'
import { toast } from 'sonner'

interface Resume {
  id: string
  filename: string
  url: string
  created_at: string
}

export function ResumeUpload() {
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [resumes, setResumes] = useState<Resume[]>([])
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)
      if (user) {
        fetchResumes(user.id)
      }
    }
    getUser()
  }, [supabase])

  const fetchResumes = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('resumes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setResumes(data || [])
    } catch (error) {
      console.error('获取简历失败:', error)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    if (file.type !== 'application/pdf') {
      toast.error('仅支持 PDF 格式')
      return
    }

    setLoading(true)
    try {
      const blob = await put(`resumes/${user.id}/${file.name}`, file, {
        access: 'private',
      })

      const { error } = await supabase.from('resumes').insert({
        user_id: user.id,
        filename: file.name,
        url: blob.pathname,
        file_size: file.size,
      })

      if (error) throw error

      toast.success('简历上传成功')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      fetchResumes(user.id)
    } catch (error) {
      console.error('上传失败:', error)
      toast.error('上传失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string, url: string) => {
    try {
      await del(url)

      const { error } = await supabase.from('resumes').delete().eq('id', id)

      if (error) throw error

      toast.success('简历已删除')
      if (user) {
        fetchResumes(user.id)
      }
    } catch (error) {
      console.error('删除失败:', error)
      toast.error('删除失败，请重试')
    }
  }

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4">简历管理</h2>

      <div className="mb-6">
        <div
          className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center cursor-pointer hover:border-slate-400 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
          <p className="text-sm font-medium text-slate-700">点击上传 PDF 简历</p>
          <p className="text-xs text-slate-500 mt-1">或者拖拽文件到此处</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileSelect}
          disabled={loading}
          className="hidden"
        />
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-medium text-slate-700">已上传的简历</h3>
        {resumes.length === 0 ? (
          <p className="text-sm text-slate-500">还没有上传简历</p>
        ) : (
          resumes.map((resume) => (
            <div
              key={resume.id}
              className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-sm font-medium text-slate-700">
                    {resume.filename}
                  </p>
                  <p className="text-xs text-slate-500">
                    {new Date(resume.created_at).toLocaleDateString('zh-CN')}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(resume.id, resume.url)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))
        )}
      </div>
    </Card>
  )
}
