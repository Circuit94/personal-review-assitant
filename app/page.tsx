import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import {
  Brain,
  FileText,
  MessageSquare,
  Target,
  TrendingUp,
} from 'lucide-react'

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50">
      {/* Navigation */}
      <nav className="flex justify-between items-center px-6 py-4 max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-blue-600">面试助手</h1>
        <div className="flex gap-4">
          <Button variant="ghost" asChild>
            <a href="/auth/login">登录</a>
          </Button>
          <Button asChild>
            <a href="/auth/sign-up">注册</a>
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-6 py-16 text-center">
        <h2 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6">
          AI 驱动的面试准备助手
        </h2>
        <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
          上传简历、记录面试经验、与AI对话、进行模拟面试、生成复盘分析。
          让面试准备变得更科学、更高效。
        </p>
        <Button size="lg" asChild className="mb-16">
          <a href="/auth/sign-up">开始免费使用</a>
        </Button>
      </div>

      {/* Features */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <h3 className="text-3xl font-bold text-center mb-12">核心功能</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6">
          {[
            {
              icon: FileText,
              title: '简历管理',
              description: '上传和管理你的简历，AI 助手可基于你的简历提供针对性建议',
            },
            {
              icon: MessageSquare,
              title: 'AI 聊天',
              description: '与 AI 面试教练对话，获取面试技巧、回答建议和简历优化建议',
            },
            {
              icon: Target,
              title: '模拟面试',
              description: '输入岗位信息，AI 自动生成 5 道面试题目，逐题练习和回答',
            },
            {
              icon: Brain,
              title: '面试记录',
              description: '记录真实的面试经历、遇到的问题和你的回答，积累经验',
            },
            {
              icon: TrendingUp,
              title: '复盘分析',
              description: '定期生成周/月复盘分析，找出弱点并获得改进建议',
            },
          ].map(({ icon: Icon, title, description }, i) => (
            <div key={i} className="p-6 bg-white rounded-lg border border-slate-200">
              <Icon className="w-8 h-8 text-blue-600 mb-4" />
              <h4 className="font-semibold text-slate-900 mb-2">{title}</h4>
              <p className="text-sm text-slate-600">{description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-blue-600 text-white py-12">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h3 className="text-3xl font-bold mb-4">准备好了吗？</h3>
          <p className="text-lg mb-8 opacity-90">
            立即注册，开始你的面试准备之旅
          </p>
          <Button size="lg" variant="secondary" asChild>
            <a href="/auth/sign-up">免费注册</a>
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-8">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p>&copy; 2024 面试助手. 所有权利保留。</p>
        </div>
      </footer>
    </div>
  )
}
