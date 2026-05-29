'use client'

import { useState, useEffect } from 'react'
import { api, getToken } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { FileText, Upload, Trash2, ExternalLink, Loader2, Edit3 } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import type { Resume } from '@/lib/types'

export function ResumeManager({ userId }: { userId: string }) {
  const [resumes, setResumes] = useState<Resume[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const { toast } = useToast()

  useEffect(() => {
    fetchResumes()
  }, [userId])

  const fetchResumes = async () => {
    try {
      const data = await api.getResumes()
      setResumes((data as unknown as Resume[]) || [])
    } catch (error) {
      console.error('获取简历失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 校验格式
    const validFormats = ['.pdf', '.docx', '.doc', '.jpg', '.jpeg', '.png']
    const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()
    if (!validFormats.includes(fileExt)) {
      toast({ title: '格式错误', description: '支持 PDF, DOCX, JPG, PNG 格式', variant: 'destructive' })
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: '文件太大', description: '文件不能超过 10MB', variant: 'destructive' })
      return
    }

    // 去重检测
    const existing = resumes.find((r) => r.file_name === file.name)
    if (existing) {
      toast({ title: '文件已存在', description: '同名简历已上传，请更换文件名或删除旧文件' })
      return
    }

    setUploading(true)
    setUploadProgress(0)

    try {
      // 上传文件
      setUploadProgress(30)
      const { url: fileUrl } = await api.uploadFile(file, 'resumes')

      setUploadProgress(80)

      // 保存到数据库
      const resumeRecord = await api.createResume({
        file_name: file.name,
        file_url: fileUrl,
      })

      setUploadProgress(100)
      toast({ title: '上传成功', description: '简历已上传，正在尝试提取文本...' })

      // 触发文本提取
      const token = getToken()
      fetch('/api/resume/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          resumeId: (resumeRecord as Record<string, unknown>).id,
          fileUrl,
          fileName: file.name,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            toast({ title: '简历解析完成', description: '文本内容已提取' })
            fetchResumes()
          }
        })
        .catch(() => {
          // 静默失败，用户可以手动编辑
        })

      fetchResumes()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '上传失败'
      toast({ title: '上传失败', description: message, variant: 'destructive' })
    } finally {
      setUploading(false)
      setTimeout(() => setUploadProgress(0), 1000)
    }
  }

  const handleDelete = async (resume: Resume) => {
    try {
      // 删除数据库记录
      await api.deleteResume(resume.id)

      toast({ title: '已删除' })
      fetchResumes()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '删除失败'
      toast({ title: '删除失败', description: message, variant: 'destructive' })
    }
  }

  const handleSaveText = async (resumeId: string) => {
    try {
      await api.updateResume({ id: resumeId, extracted_text: editText })

      toast({ title: '简历文本已保存' })
      setEditingId(null)
      fetchResumes()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '保存失败'
      toast({ title: '保存失败', description: message, variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">简历管理</h2>
          <p className="text-sm text-muted-foreground mt-1">
            上传简历后，AI 将基于简历内容生成更有针对性的面试题目
          </p>
        </div>
      </div>

      {/* 上传区域 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 hover:bg-muted/50 transition-all cursor-pointer relative">
            <Input
              type="file"
              accept=".pdf,.docx,.doc,.jpg,.jpeg,.png"
              onChange={handleFileUpload}
              disabled={uploading}
              className="absolute inset-0 opacity-0 cursor-pointer z-10"
            />
            <Upload className="h-10 w-10 text-muted-foreground mb-4" />
            <p className="text-sm font-medium">点击上传简历文件</p>
            <p className="text-xs text-muted-foreground mt-2">支持 PDF, DOCX, JPG, PNG (最大 10MB)</p>
          </div>
          {uploading && (
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-xs">
                <span>正在上传...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-1" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* 简历列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {resumes.map((resume) => (
          <Card key={resume.id}>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <CardTitle className="text-sm font-medium truncate max-w-[200px]">
                    {resume.file_name}
                  </CardTitle>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => window.open(resume.file_url, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-500 hover:text-red-700"
                    onClick={() => handleDelete(resume)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{(resume.file_size / 1024).toFixed(0)} KB</span>
                <span>•</span>
                <span>{new Date(resume.created_at).toLocaleDateString()}</span>
                <span>•</span>
                {resume.extracted_text ? (
                  <Badge variant="default" className="bg-green-100 text-green-700 text-[10px]">
                    已解析
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-[10px]">
                    待解析
                  </Badge>
                )}
              </div>

              {/* 文本编辑区域 */}
              {editingId === resume.id ? (
                <div className="space-y-2">
                  <Textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    placeholder="粘贴简历文本内容..."
                    className="min-h-[120px] text-xs"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleSaveText(resume.id)}>
                      保存
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                      取消
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  {resume.extracted_text ? (
                    <p className="text-xs text-muted-foreground line-clamp-3">
                      {resume.extracted_text.slice(0, 150)}...
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">
                      暂未提取文本，点击编辑手动粘贴简历内容
                    </p>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 h-7 text-xs"
                    onClick={() => {
                      setEditingId(resume.id)
                      setEditText(resume.extracted_text || '')
                    }}
                  >
                    <Edit3 className="mr-1 h-3 w-3" />
                    {resume.extracted_text ? '编辑文本' : '手动粘贴'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {resumes.length === 0 && !loading && (
          <div className="col-span-full text-center py-12 border-2 border-dashed rounded-lg">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-muted-foreground">暂无简历，上传您的第一份简历开始使用</p>
          </div>
        )}

        {loading && (
          <div className="col-span-full text-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
          </div>
        )}
      </div>
    </div>
  )
}
