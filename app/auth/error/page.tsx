import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md">
        <div className="p-8 text-center">
          <div className="flex justify-center mb-4">
            <AlertCircle className="w-16 h-16 text-red-600" />
          </div>
          <h1 className="text-3xl font-bold mb-2">认证错误</h1>
          <p className="text-slate-600 mb-6">
            认证过程中发生错误，请检查你的邮箱链接是否有效或重新尝试。
          </p>
          <Button asChild className="w-full">
            <a href="/auth/login">返回登录</a>
          </Button>
        </div>
      </Card>
    </div>
  )
}
