'use client'

import { useState, useEffect } from 'react'
import { api, getToken } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import {
  FileText,
  Upload,
  Trash2,
  ExternalLink,
  Loader2,
  Edit3,
  Tag,
  Check,
  X,
  Plus,
  Target,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
} from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import type { Resume } from '@/lib/types'

const PRESET_LABELS = ['互联网', '国企', '外企', '金融', '通用']

interface JdMatchResult {
  score: number
  summary: string
  matchedKeywords: string[]
  missingKeywords: string[]
  strengths: string[]
  suggestions: string[]
}

export function ResumeManager({ userId }: { userId: string }) {
  const [resumes, setResumes] = useState<Resume[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [uploadLabel, setUploadLabel] = useState('')
  const [showUploadLabel, setShowUploadLabel] = useState(false)
  // JD 匹配度分析
  const [showJdMatch, setShowJdMatch] = useState(false)
  const [jdText, setJdText] = useState('')
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null)
  const [jdMatchLoading, setJdMatchLoading] = useState(false)
  const [jdMatchResult, setJdMatchResult] = useState<JdMatchResult | null>(null)
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

    setUploading(true)
    setUploadProgress(0)

    try {
      setUploadProgress(30)
      const { url: fileUrl } = await api.uploadFile(file, 'resumes')

      setUploadProgress(80)

      const resumeRecord = await api.createResume({
        file_name: file.name,
        file_url: fileUrl,
        version_label: uploadLabel.trim() || '默认',
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
        .catch(() => {})

      setUploadLabel('')
      setShowUploadLabel(false)
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

  const handleSaveLabel = async (resumeId: string) => {
    if (!editLabel.trim()) return
    try {
      await api.updateResume({ id: resumeId, version_label: editLabel.trim() })
      toast({ title: '标签已更新' })
      setEditingLabelId(null)
      fetchResumes()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '保存失败'
      toast({ title: '保存标签失败', description: message, variant: 'destructive' })
    }
  }

  // JD 匹配度分析
  const handleJdMatch = async () => {
    if (!jdText.trim()) {
      toast({ title: '请输入 JD 内容', variant: 'destructive' })
      return
    }

    const resume = resumes.find((r) => r.id === selectedResumeId)
    if (!resume?.extracted_text) {
      toast({ title: '请选择一份已解析的简历', variant: 'destructive' })
      return
    }

    setJdMatchLoading(true)
    setJdMatchResult(null)

    try {
      const token = getToken()
      const res = await fetch('/api/resume/jd-match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          resumeText: resume.extracted_text,
          jdText: jdText.trim(),
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || '分析失败')
      }

      const result = await res.json()
      setJdMatchResult(result)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '分析失败'
      toast({ title: '匹配分析失败', description: message, variant: 'destructive' })
    } finally {
      setJdMatchLoading(false)
    }
  }

  // 按版本标签分组
  const groupedResumes = resumes.reduce<Record<string, Resume[]>>((acc, resume) => {
    const label = resume.version_label || '默认'
    if (!acc[label]) acc[label] = []
    acc[label].push(resume)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">简历管理</h2>
          <p className="text-sm text-muted-foreground mt-1">
            管理不同版本的简历，面试时可选择对应版本
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          共 {resumes.length} 份简历
        </Badge>
      </div>

      {/* JD 匹配度分析 */}
      <Card className="border-blue-100 bg-gradient-to-r from-blue-50/50 to-indigo-50/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-base">JD 匹配度分析</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setShowJdMatch(!showJdMatch); setJdMatchResult(null) }}
            >
              {showJdMatch ? '收起' : '展开分析'}
            </Button>
          </div>
          {!showJdMatch && (
            <p className="text-xs text-muted-foreground mt-1">
              粘贴目标岗位 JD，AI 自动分析简历匹配度并给出优化建议
            </p>
          )}
        </CardHeader>
        {showJdMatch && (
          <CardContent className="space-y-4">
            {/* 选择简历 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">选择简历</label>
              <select
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                value={selectedResumeId || ''}
                onChange={(e) => setSelectedResumeId(e.target.value || null)}
              >
                <option value="">-- 选择一份简历 --</option>
                {resumes.filter((r) => r.extracted_text).map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.file_name} ({r.version_label || '默认'})
                  </option>
                ))}
              </select>
              {resumes.filter(r => r.extracted_text).length === 0 && (
                <p className="text-xs text-amber-600">暂无已解析的简历，请先上传简历并等待文本提取完成</p>
              )}
            </div>

            {/* JD 输入 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">目标岗位 JD</label>
              <Textarea
                placeholder="粘贴完整的岗位描述 (Job Description)..."
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
                className="min-h-[120px] text-sm"
              />
            </div>

            <Button
              onClick={handleJdMatch}
              disabled={jdMatchLoading || !selectedResumeId || !jdText.trim()}
              className="w-full"
            >
              {jdMatchLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  AI 分析中...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  分析匹配度
                </>
              )}
            </Button>

            {/* 分析结果 */}
            {jdMatchResult && (
              <div className="space-y-4 pt-4 border-t">
                {/* 评分 */}
                <div className="flex items-center gap-4">
                  <div className={`text-4xl font-bold ${
                    jdMatchResult.score >= 70 ? 'text-green-600' :
                    jdMatchResult.score >= 50 ? 'text-amber-600' : 'text-red-600'
                  }`}>
                    {jdMatchResult.score}
                  </div>
                  <div>
                    <p className="text-sm font-medium">匹配度评分</p>
                    <p className="text-xs text-muted-foreground">{jdMatchResult.summary}</p>
                  </div>
                </div>

                {/* 匹配关键词 */}
                {jdMatchResult.matchedKeywords.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-700">匹配的关键词</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {jdMatchResult.matchedKeywords.map((kw, i) => (
                        <Badge key={i} variant="secondary" className="bg-green-50 text-green-700 text-xs">
                          {kw}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* 缺失关键词 */}
                {jdMatchResult.missingKeywords.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <span className="text-sm font-medium text-amber-700">缺失的关键词</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {jdMatchResult.missingKeywords.map((kw, i) => (
                        <Badge key={i} variant="secondary" className="bg-amber-50 text-amber-700 text-xs">
                          {kw}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* 优化建议 */}
                {jdMatchResult.suggestions.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <TrendingUp className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-700">优化建议</span>
                    </div>
                    <ul className="space-y-1.5">
                      {jdMatchResult.suggestions.map((s, i) => (
                        <li key={i} className="text-xs text-muted-foreground flex gap-2">
                          <span className="text-blue-500 shrink-0">{i + 1}.</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* 上传区域 */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          {/* 版本标签选择 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">版本标签</span>
              {!showUploadLabel && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => setShowUploadLabel(true)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  设置标签
                </Button>
              )}
            </div>
            {showUploadLabel && (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_LABELS.map((label) => (
                    <button
                      key={label}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                        uploadLabel === label
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-600'
                      }`}
                      onClick={() => setUploadLabel(uploadLabel === label ? '' : label)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="或输入自定义标签，如：字节版、腾讯版..."
                    value={uploadLabel}
                    onChange={(e) => setUploadLabel(e.target.value)}
                    className="h-8 text-xs"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8"
                    onClick={() => { setShowUploadLabel(false); setUploadLabel('') }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {uploadLabel && (
                  <p className="text-xs text-muted-foreground">
                    将上传为 <span className="font-medium text-blue-600">{uploadLabel}</span> 版本
                  </p>
                )}
              </div>
            )}
          </div>

          {/* 上传按钮 */}
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
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span>正在上传...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-1" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* 按版本分组展示简历 */}
      {Object.keys(groupedResumes).length > 0 ? (
        Object.entries(groupedResumes).map(([label, groupResumes]) => (
          <div key={label} className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs font-medium">
                {label}
              </Badge>
              <span className="text-xs text-muted-foreground">{groupResumes.length} 份</span>
              <div className="flex-1 border-b" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {groupResumes.map((resume) => (
                <Card key={resume.id} className="group">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <FileText className="h-5 w-5 text-blue-600 shrink-0" />
                        <CardTitle className="text-sm font-medium truncate">
                          {resume.file_name}
                        </CardTitle>
                      </div>
                      <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        {resume.file_url && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => window.open(resume.file_url, '_blank')}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-500 hover:text-red-700"
                          onClick={() => handleDelete(resume)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* 标签编辑 */}
                    <div className="flex items-center gap-2">
                      {editingLabelId === resume.id ? (
                        <div className="flex items-center gap-1.5 flex-1">
                          <Input
                            value={editLabel}
                            onChange={(e) => setEditLabel(e.target.value)}
                            className="h-7 text-xs flex-1"
                            placeholder="输入版本标签"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveLabel(resume.id)
                              if (e.key === 'Escape') setEditingLabelId(null)
                            }}
                            autoFocus
                          />
                          <div className="flex flex-wrap gap-1">
                            {PRESET_LABELS.map((l) => (
                              <button
                                key={l}
                                className="text-[10px] px-1.5 py-0.5 rounded border hover:bg-muted"
                                onClick={() => setEditLabel(l)}
                              >
                                {l}
                              </button>
                            ))}
                          </div>
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleSaveLabel(resume.id)}>
                            <Check className="h-3 w-3 text-green-600" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditingLabelId(null)}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className="text-[10px] cursor-pointer hover:bg-muted"
                            onClick={() => {
                              setEditingLabelId(resume.id)
                              setEditLabel(resume.version_label || '默认')
                            }}
                          >
                            <Tag className="h-2.5 w-2.5 mr-1" />
                            {resume.version_label || '默认'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(resume.created_at).toLocaleDateString('zh-CN')}
                          </span>
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
            </div>
          </div>
        ))
      ) : (
        !loading && (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-muted-foreground">暂无简历，上传您的第一份简历开始使用</p>
            <p className="text-xs text-muted-foreground mt-1">支持上传多个版本（互联网、国企、外企等）</p>
          </div>
        )
      )}

      {loading && (
        <div className="text-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
        </div>
      )}
    </div>
  )
}
