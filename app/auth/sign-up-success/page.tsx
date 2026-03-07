import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { CheckCircle } from 'lucide-react'

export default function SignUpSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md">
        <div className="p-8 text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="w-16 h-16 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold mb-2">注册成功！</h1>
          <p className="text-slate-600 mb-6">
            请检查你的邮箱，点击确认链接完成邮箱验证。
          </p>
          <Button asChild className="w-full">
            <a href="/auth/login">返回登录</a>
          </Button>
        </div>
      </Card>
    </div>
  )
}
