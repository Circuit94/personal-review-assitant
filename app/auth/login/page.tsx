'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { AlertCircle, RefreshCw } from 'lucide-react'

const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000

function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    return (
      msg.includes('fetch') ||
      msg.includes('network') ||
      msg.includes('timeout') ||
      msg.includes('econnrefused') ||
      msg.includes('enotfound') ||
      msg.includes('aborted')
    )
  }
  return false
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    if (msg.includes('invalid login credentials')) {
      return '邮箱或密码错误，请检查后重试'
    }
    if (msg.includes('email not confirmed')) {
      return '邮箱未验证，请先检查邮箱并点击确认链接'
    }
    if (isNetworkError(error)) {
      return '网络连接异常，正在重试...'
    }
    return error.message
  }
  return '登录失败，请重试'
}

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  const attemptLogin = async (retriesLeft: number): Promise<void> => {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      // Only retry on network errors, not on auth errors
      if (isNetworkError(signInError) && retriesLeft > 0) {
        setRetryCount(MAX_RETRIES - retriesLeft + 1)
        setError(`网络异常，正在第 ${MAX_RETRIES - retriesLeft + 1} 次重试...`)
        await delay(RETRY_DELAY_MS)
        return attemptLogin(retriesLeft - 1)
      }
      throw signInError
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setRetryCount(0)
    setLoading(true)

    try {
      await attemptLogin(MAX_RETRIES)

      // Use router.push + refresh to ensure middleware picks up new cookies
      router.push('/dashboard')
      router.refresh()
    } catch (err: unknown) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
      setRetryCount(0)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md">
        <div className="p-8">
          <h1 className="text-3xl font-bold text-center mb-2">面试助手</h1>
          <p className="text-center text-slate-600 mb-8">登录你的账户</p>

          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                {retryCount > 0 ? (
                  <RefreshCw size={16} className="animate-spin flex-shrink-0" />
                ) : (
                  <AlertCircle size={16} className="flex-shrink-0" />
                )}
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                邮箱
              </label>
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                密码
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
                minLength={6}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading
                ? retryCount > 0
                  ? `重试中 (${retryCount}/${MAX_RETRIES})...`
                  : '登录中...'
                : '登录'}
            </Button>
          </form>

          <p className="text-center text-sm text-slate-600 mt-4">
            还没有账户？{' '}
            <a href="/auth/sign-up" className="text-blue-600 hover:underline">
              注册
            </a>
          </p>
        </div>
      </Card>
    </div>
  )
}
