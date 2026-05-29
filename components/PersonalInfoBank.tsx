'use client'

import { useState, useEffect, useCallback } from 'react'
import { api, getToken } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import {
  Plus,
  Trash2,
  Copy,
  Check,
  Edit3,
  Save,
  X,
  Paperclip,
  Download,
  FolderOpen,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'

interface InfoField {
  id: string
  module_id: string
  label: string
  value: string
  sort_order: number
}

interface InfoAttachment {
  id: string
  module_id: string
  file_name: string
  file_url: string
  file_size: number
  created_at: string
}

interface InfoModule {
  id: string
  name: string
  icon: string
  sort_order: number
  fields: InfoField[]
  attachments: InfoAttachment[]
}

export function PersonalInfoBank({ userId }: { userId: string }) {
  const [modules, setModules] = useState<InfoModule[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set())
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editingModule, setEditingModule] = useState<string | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [newModuleName, setNewModuleName] = useState('')
  const [showNewModule, setShowNewModule] = useState(false)
  const [newFieldLabel, setNewFieldLabel] = useState('')
  const [addingFieldTo, setAddingFieldTo] = useState<string | null>(null)
  const { toast } = useToast()

  // 临时编辑状态
  const [editLabel, setEditLabel] = useState('')
  const [editValue, setEditValue] = useState('')
  const [editModuleName, setEditModuleName] = useState('')
  const [editModuleIcon, setEditModuleIcon] = useState('')

  void userId // userId is handled by auth token

  const fetchModules = useCallback(async () => {
    try {
      const data = await api.getInfoModules()
      const parsed = data as unknown as InfoModule[]
      setModules(parsed)
      // 默认展开所有模块
      if (expandedModules.size === 0) {
        setExpandedModules(new Set(parsed.map((m) => m.id)))
      }
    } catch (error) {
      console.error('获取信息模块失败:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchModules()
  }, [fetchModules])

  const toggleModule = (id: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // 一键复制
  const copyToClipboard = async (text: string, fieldId: string) => {
    if (!text) {
      toast({ title: '内容为空', description: '请先填写内容再复制', variant: 'destructive' })
      return
    }
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(fieldId)
      setTimeout(() => setCopiedField(null), 2000)
      toast({ title: '已复制', description: '内容已复制到剪贴板' })
    } catch {
      toast({ title: '复制失败', variant: 'destructive' })
    }
  }

  // 保存字段
  const saveField = async (fieldId: string) => {
    try {
      await api.updateInfoField({ id: fieldId, label: editLabel, value: editValue })
      setEditingField(null)
      fetchModules()
    } catch (error) {
      toast({ title: '保存失败', description: String(error), variant: 'destructive' })
    }
  }

  // 删除字段
  const deleteField = async (fieldId: string) => {
    try {
      await api.deleteInfoField(fieldId)
      fetchModules()
      toast({ title: '已删除' })
    } catch (error) {
      toast({ title: '删除失败', description: String(error), variant: 'destructive' })
    }
  }

  // 新增字段
  const addField = async (moduleId: string) => {
    if (!newFieldLabel.trim()) return
    try {
      await api.createInfoField({ module_id: moduleId, label: newFieldLabel.trim() })
      setNewFieldLabel('')
      setAddingFieldTo(null)
      fetchModules()
    } catch (error) {
      toast({ title: '添加失败', description: String(error), variant: 'destructive' })
    }
  }

  // 新增模块
  const addModule = async () => {
    if (!newModuleName.trim()) return
    try {
      await api.createInfoModule({ name: newModuleName.trim(), fields: [{ label: '字段1' }] })
      setNewModuleName('')
      setShowNewModule(false)
      fetchModules()
      toast({ title: '模块已创建' })
    } catch (error) {
      toast({ title: '创建失败', description: String(error), variant: 'destructive' })
    }
  }

  // 删除模块
  const deleteModule = async (moduleId: string) => {
    try {
      await api.deleteInfoModule(moduleId)
      fetchModules()
      toast({ title: '模块已删除' })
    } catch (error) {
      toast({ title: '删除失败', description: String(error), variant: 'destructive' })
    }
  }

  // 保存模块名称/图标
  const saveModule = async (moduleId: string) => {
    try {
      await api.updateInfoModule({ id: moduleId, name: editModuleName, icon: editModuleIcon })
      setEditingModule(null)
      fetchModules()
    } catch (error) {
      toast({ title: '保存失败', description: String(error), variant: 'destructive' })
    }
  }

  // 上传附件
  const uploadAttachment = async (moduleId: string, file: File) => {
    try {
      const result = await api.uploadFile(file, 'info')
      await api.createInfoAttachment({
        module_id: moduleId,
        file_name: file.name,
        file_url: result.url,
        file_size: file.size,
      })
      fetchModules()
      toast({ title: '文件已上传', description: file.name })
    } catch (error) {
      toast({ title: '上传失败', description: String(error), variant: 'destructive' })
    }
  }

  // 删除附件
  const deleteAttachment = async (attachmentId: string) => {
    try {
      await api.deleteInfoAttachment(attachmentId)
      fetchModules()
      toast({ title: '附件已删除' })
    } catch (error) {
      toast({ title: '删除失败', description: String(error), variant: 'destructive' })
    }
  }

  // 复制整个模块所有字段
  const copyAllFields = async (module: InfoModule) => {
    const text = module.fields
      .filter((f) => f.value)
      .map((f) => `${f.label}：${f.value}`)
      .join('\n')
    if (!text) {
      toast({ title: '模块内容为空', description: '请先填写字段内容', variant: 'destructive' })
      return
    }
    try {
      await navigator.clipboard.writeText(text)
      toast({ title: '已复制全部字段', description: `${module.name} 的所有内容已复制` })
    } catch {
      toast({ title: '复制失败', variant: 'destructive' })
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 顶部说明和操作 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">个人信息库</h2>
          <p className="text-sm text-muted-foreground mt-1">
            网申时一键复制个人信息，告别反复翻找。点击字段值即可复制。
          </p>
        </div>
        <Button onClick={() => setShowNewModule(true)} size="sm" className="shrink-0">
          <Plus className="mr-2 h-4 w-4" />
          新增模块
        </Button>
      </div>

      {/* 新增模块表单 */}
      {showNewModule && (
        <Card className="border-dashed border-2 border-blue-300 bg-blue-50/50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Input
                placeholder="模块名称（如：第二段实习经历）"
                value={newModuleName}
                onChange={(e) => setNewModuleName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addModule()}
                autoFocus
                className="flex-1"
              />
              <Button size="sm" onClick={addModule} disabled={!newModuleName.trim()}>
                <Check className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setShowNewModule(false); setNewModuleName('') }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 模块列表 */}
      {modules.map((module) => (
        <Card key={module.id} className="overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 cursor-pointer flex-1" onClick={() => toggleModule(module.id)}>
                {expandedModules.has(module.id) ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                {editingModule === module.id ? (
                  <div className="flex items-center gap-2 flex-1" onClick={(e) => e.stopPropagation()}>
                    <Input
                      value={editModuleIcon}
                      onChange={(e) => setEditModuleIcon(e.target.value)}
                      className="w-12 text-center"
                      maxLength={2}
                    />
                    <Input
                      value={editModuleName}
                      onChange={(e) => setEditModuleName(e.target.value)}
                      className="flex-1"
                      onKeyDown={(e) => e.key === 'Enter' && saveModule(module.id)}
                    />
                    <Button size="sm" variant="ghost" onClick={() => saveModule(module.id)}>
                      <Save className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingModule(null)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <CardTitle className="text-base flex items-center gap-2">
                    <span>{module.icon}</span>
                    <span>{module.name}</span>
                    <span className="text-xs text-muted-foreground font-normal">
                      ({module.fields.length} 个字段{module.attachments.length > 0 ? `，${module.attachments.length} 个附件` : ''})
                    </span>
                  </CardTitle>
                )}
              </div>

              {editingModule !== module.id && (
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyAllFields(module)}
                    title="复制全部字段"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingModule(module.id)
                      setEditModuleName(module.name)
                      setEditModuleIcon(module.icon)
                    }}
                    title="编辑模块"
                  >
                    <Edit3 className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-500 hover:text-red-700"
                    onClick={() => deleteModule(module.id)}
                    title="删除模块"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>

          {expandedModules.has(module.id) && (
            <CardContent className="pt-0 space-y-3">
              {/* 字段列表 */}
              <div className="space-y-2">
                {module.fields.map((field) => (
                  <div key={field.id} className="group">
                    {editingField === field.id ? (
                      // 编辑模式
                      <div className="flex flex-col sm:flex-row gap-2 p-2 bg-blue-50 rounded-lg">
                        <Input
                          value={editLabel}
                          onChange={(e) => setEditLabel(e.target.value)}
                          placeholder="字段名"
                          className="sm:w-1/3"
                        />
                        <Textarea
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          placeholder="字段内容"
                          className="sm:flex-1 min-h-[60px]"
                        />
                        <div className="flex gap-1 shrink-0">
                          <Button size="sm" onClick={() => saveField(field.id)}>
                            <Save className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingField(null)}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      // 展示模式
                      <div className="flex items-start gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                        <span className="text-sm font-medium text-muted-foreground w-28 sm:w-36 shrink-0 pt-0.5">
                          {field.label}
                        </span>
                        <div
                          className="flex-1 text-sm cursor-pointer hover:bg-blue-50 rounded px-2 py-0.5 min-h-[24px] transition-colors"
                          onClick={() => copyToClipboard(field.value, field.id)}
                          title={field.value ? '点击复制' : '点击编辑'}
                        >
                          {field.value || (
                            <span className="text-muted-foreground italic">未填写</span>
                          )}
                        </div>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          {copiedField === field.id ? (
                            <Check className="h-3.5 w-3.5 text-green-500" />
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={() => copyToClipboard(field.value, field.id)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => {
                              setEditingField(field.id)
                              setEditLabel(field.label)
                              setEditValue(field.value)
                            }}
                          >
                            <Edit3 className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 text-red-400 hover:text-red-600"
                            onClick={() => deleteField(field.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* 新增字段 */}
              {addingFieldTo === module.id ? (
                <div className="flex items-center gap-2 pl-2">
                  <Input
                    placeholder="字段名称（如：公司名称）"
                    value={newFieldLabel}
                    onChange={(e) => setNewFieldLabel(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addField(module.id)}
                    autoFocus
                    className="flex-1"
                  />
                  <Button size="sm" onClick={() => addField(module.id)} disabled={!newFieldLabel.trim()}>
                    <Check className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setAddingFieldTo(null); setNewFieldLabel('') }}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-muted-foreground ml-2"
                  onClick={() => setAddingFieldTo(module.id)}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  添加字段
                </Button>
              )}

              {/* 附件区域 */}
              <div className="border-t pt-3 mt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Paperclip className="h-3 w-3" />
                    附件文件
                  </span>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) uploadAttachment(module.id, file)
                        e.target.value = ''
                      }}
                    />
                    <span className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                      <Plus className="h-3 w-3" />
                      上传文件
                    </span>
                  </label>
                </div>

                {module.attachments.length > 0 ? (
                  <div className="space-y-1">
                    {module.attachments.map((att) => (
                      <div
                        key={att.id}
                        className="flex items-center gap-2 p-2 bg-gray-50 rounded text-sm group"
                      >
                        <FolderOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="flex-1 truncate">{att.file_name}</span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {formatFileSize(att.file_size)}
                        </span>
                        <a
                          href={att.file_url}
                          download={att.file_name}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          title="下载"
                        >
                          <Download className="h-3.5 w-3.5 text-blue-500" />
                        </a>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-red-400"
                          onClick={() => deleteAttachment(att.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic pl-1">
                    暂无附件，可上传证书、推荐信等文件
                  </p>
                )}
              </div>
            </CardContent>
          )}
        </Card>
      ))}

      {modules.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>暂无信息模块</p>
          <p className="text-sm mt-1">点击上方「新增模块」开始创建</p>
        </div>
      )}
    </div>
  )
}
