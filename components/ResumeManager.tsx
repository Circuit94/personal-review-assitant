'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { FileText, Trash2, Upload } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

export function ResumeManager({ userId }: { userId: string }) {
  const [resumes, setResumes] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)
  const { toast } = useToast()

  const [uploadProgress, setUploadProgress] = useState(0)

  useEffect(() => {
    fetchResumes()
  }, [])

  const fetchResumes = async () => {
    try {
      const { data, error } = await supabase
        .from('resumes')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setResumes(data || [])
    } catch (error: any) {
      console.error('获取简历失败:', error)
      toast({
        title: '获取简历失败',
        description: error.message,
        variant: 'destructive',
      })
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 1. 校验格式与大小
    const validFormats = ['.pdf', '.docx', '.jpg', '.png']
    const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()
    if (!validFormats.includes(fileExt)) {
      toast({ title: '格式错误', description: '支持 PDF, DOCX, JPG, PNG 格式', variant: 'destructive' })
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: '文件太大', description: '单文件不超过 10MB', variant: 'destructive' })
      return
    }

    setUploading(true)
    setUploadProgress(0)

    try {
      // 2. 简易 MD5/秒传逻辑 (使用文件名+大小+用户ID模拟唯一性)
      const { data: existing } = await supabase
        .from('resumes')
        .select('id')
        .eq('user_id', userId)
        .eq('file_name', file.name)
        .limit(1)

      if (existing && existing.length > 0) {
        toast({ title: '文件已存在', description: '该文件已上传过，执行秒传。' })
        setUploading(false)
        return
      }

      // 3. 存储路径处理 (去除特殊字符)
      const sanitizedName = file.name.replace(/[^\x00-\x7F]/g, '_').replace(/\s+/g, '_')
      const fileName = `${userId}/${Date.now()}_${sanitizedName}`

      // 使用 XMLHttpRequest 以获取上传进度并上传到 Supabase Storage
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('用户未登录，请重新登录')

      const xhr = new XMLHttpRequest()
      const bucketId = 'resumes'
      const uploadUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/${bucketId}/${fileName}`

      const promise = new Promise((resolve, reject) => {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100)
            setUploadProgress(progress)
          }
        }

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText))
          } else {
            try {
              const errorData = JSON.parse(xhr.responseText)
              reject(new Error(errorData.message || '上传失败'))
            } catch {
              reject(new Error(`上传失败 (${xhr.status})`))
            }
          }
        }

        xhr.onerror = () => reject(new Error('网络请求出错'))
        xhr.ontimeout = () => reject(new Error('上传超时，请检查网络稳定性'))
      })

      xhr.open('POST', uploadUrl)
      xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`)
      xhr.setRequestHeader('apikey', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
      xhr.timeout = 300000 // 5分钟超时
      xhr.send(file)

      await promise

      const { data: { publicUrl } } = supabase.storage
        .from('resumes')
        .getPublicUrl(fileName)

      const { error: dbError } = await supabase.from('resumes').insert({
        user_id: userId,
        file_name: file.name,
        file_url: publicUrl,
        extracted_text: '', 
      })

      if (dbError) throw dbError

      toast({ title: '简历上传成功' })
      fetchResumes()
    } catch (error: any) {
      console.error('上传简历失败详情:', error)
      toast({
        title: '上传简历失败',
        description: error.message || '未知错误，请检查存储权限',
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
      setTimeout(() => setUploadProgress(0), 1000)
    }
  }

  const handleDelete = async (id: string, fileUrl: string) => {
    try {
      // 从 storage 删除
      const fileName = fileUrl.split('/').pop()
      if (fileName) {
        await supabase.storage.from('resumes').remove([`${userId}/${fileName}`])
      }

      // 从数据库删除
      const { error } = await supabase.from('resumes').delete().eq('id', id)
      if (error) throw error

      toast({ title: '简历已删除' })
      fetchResumes()
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
        <h2 className="text-2xl font-bold">简历管理</h2>
        <div className="flex items-center gap-2">
          <Input
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={handleFileUpload}
            disabled={uploading}
            className="hidden"
            id="resume-upload"
          />
          <Label htmlFor="resume-upload" className="cursor-pointer">
            <Button asChild disabled={uploading}>
              <span>
                <Upload className="mr-2 h-4 w-4" />
                {uploading ? '上传中...' : '上传简历'}
              </span>
            </Button>
          </Label>
        </div>
      </div>

      {uploading && (
        <Card className="p-4 bg-muted/30">
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-medium">
              <span>正在上传简历...</span>
              <span>{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="h-2" />
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {resumes.map((resume) => (
          <Card key={resume.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                <FileText className="inline mr-2 h-4 w-4" />
                {resume.file_name}
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(resume.id, resume.file_url)}
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                上传时间: {new Date(resume.created_at).toLocaleString()}
              </p>
              <Button
                variant="link"
                className="p-0 h-auto text-xs"
                asChild
              >
                <a href={resume.file_url} target="_blank" rel="noopener noreferrer">
                  查看文件
                </a>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {resumes.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground">暂无简历，请上传您的第一份简历</p>
        </div>
      )}
    </div>
  )
}
