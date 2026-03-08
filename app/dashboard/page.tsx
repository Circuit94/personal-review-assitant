'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      window.location.href = '/'
      return
    }

    setUser(user)
    setLoading(false)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">加载中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">面试助手 - 仪表盘</h1>
          <Button onClick={handleSignOut} variant="outline">
            退出登录
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>欢迎回来！</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              邮箱: {user?.email}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              您的面试助手功能正在开发中...
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
