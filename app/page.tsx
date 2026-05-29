'use client'

import { useState, useEffect } from 'react'
import { signIn, signUp, verifySession } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Brain, MessageSquare, Calendar, Zap, Mic, TrendingUp } from 'lucide-react'

export default function Home() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  // 如果已登录，直接跳转
  useEffect(() => {
    verifySession().then((user) => {
      if (user) window.location.href = '/dashboard'
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    try {
      if (isLogin) {
        await signIn(email, password)
        window.location.href = '/dashboard'
      } else {
        if (password !== confirmPassword) {
          throw new Error('密码不匹配')
        }
        await signUp(email, password)
        window.location.href = '/dashboard'
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '操作失败，请重试'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      {/* 左侧：产品介绍 */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 flex-col justify-center px-12 xl:px-20">
        <div className="max-w-lg">
          <h1 className="text-4xl xl:text-5xl font-bold tracking-tight text-gray-900 dark:text-white">
            面试助手
          </h1>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
            AI 驱动的一站式面试准备平台，从简历优化到模拟面试，帮你系统性提升面试表现。
          </p>

          <div className="mt-10 grid grid-cols-2 gap-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                <Brain className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">AI 模拟面试</h3>
                <p className="text-xs text-muted-foreground mt-0.5">多轮追问对话，真实还原面试场景</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                <MessageSquare className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">个性化辅导</h3>
                <p className="text-xs text-muted-foreground mt-0.5">基于简历的定制化面试建议</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                <Zap className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">面试冲刺</h3>
                <p className="text-xs text-muted-foreground mt-0.5">30 分钟快速准备，AI 定制清单</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                <Calendar className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">面试看板</h3>
                <p className="text-xs text-muted-foreground mt-0.5">按阶段追踪所有面试进度</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
                <Mic className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">录音分析</h3>
                <p className="text-xs text-muted-foreground mt-0.5">上传面试录音，AI 多维度复盘</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                <TrendingUp className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">进步追踪</h3>
                <p className="text-xs text-muted-foreground mt-0.5">量化面试准备度，可视化成长</p>
              </div>
            </div>
          </div>

          <p className="mt-10 text-xs text-muted-foreground">
            数据完全本地存储，无需担心隐私泄露。支持 DeepSeek / OpenAI 等多种 AI 模型。
          </p>
        </div>
      </div>

      {/* 右侧：登录表单 */}
      <div className="flex w-full lg:w-1/2 xl:w-2/5 items-center justify-center p-4 sm:p-8">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="space-y-1 text-center pb-4">
            <div className="lg:hidden mb-4">
              <h1 className="text-2xl font-bold">面试助手</h1>
              <p className="text-sm text-muted-foreground mt-1">AI 驱动的一站式面试准备平台</p>
            </div>
            <CardTitle className="text-xl">
              {isLogin ? '欢迎回来' : '创建账户'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {message && (
                <Alert>
                  <AlertDescription>{message}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">邮箱</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">密码</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  minLength={6}
                  className="h-11"
                />
              </div>

              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">确认密码</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={loading}
                    minLength={6}
                    className="h-11"
                  />
                </div>
              )}

              <Button type="submit" className="w-full h-11 text-base" disabled={loading}>
                {loading ? '处理中...' : isLogin ? '登录' : '注册'}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col items-center gap-3 pt-0">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin)
                setError('')
                setMessage('')
              }}
              className="text-sm text-blue-600 hover:underline dark:text-blue-400"
              disabled={loading}
            >
              {isLogin ? '没有账户？立即注册' : '已有账户？登录'}
            </button>

            {/* 移动端功能简介 */}
            <div className="lg:hidden w-full pt-4 border-t">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <Brain className="h-5 w-5 text-blue-500 mx-auto" />
                  <p className="text-[10px] text-muted-foreground mt-1">AI 模拟面试</p>
                </div>
                <div>
                  <Zap className="h-5 w-5 text-amber-500 mx-auto" />
                  <p className="text-[10px] text-muted-foreground mt-1">面试冲刺</p>
                </div>
                <div>
                  <TrendingUp className="h-5 w-5 text-green-500 mx-auto" />
                  <p className="text-[10px] text-muted-foreground mt-1">进步追踪</p>
                </div>
              </div>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
