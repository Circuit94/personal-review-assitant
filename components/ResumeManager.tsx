'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { FileText, Trash2, Upload } from 'lucide-react'

export function ResumeManager({ userId }: { userId: string }) {
  const [resumes, setResumes] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)
  const { toast } = useToast()

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

    setUploading(true)
    try {
      const fileName = `${userId}/${Date.now()}_${file.name}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('resumes')
        .getPublicUrl(fileName)

      const { error: dbError } = await supabase.from('resumes').insert({
        user_id: userId,
        file_name: file.name,
        file_url: publicUrl,
        extracted_text: '', // 这里可以调用外部 API 提取文本，目前留空
      })

      if (dbError) throw dbError

      toast({ title: '简历上传成功' })
      fetchResumes()
    } catch (error: any) {
      console.error('上传简历失败:', error)
      toast({
        title: '上传简历失败',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
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
