import { NextResponse } from 'next/server'
import { signIn, signUp, verifyToken } from '@/lib/auth'

export async function POST(req: Request) {
  try {
    const { action, email, password, token } = await req.json()

    if (action === 'signup') {
      if (!email || !password) {
        return NextResponse.json({ error: '邮箱和密码不能为空' }, { status: 400 })
      }
      if (password.length < 6) {
        return NextResponse.json({ error: '密码至少 6 位' }, { status: 400 })
      }
      const result = signUp(email, password)
      if ('error' in result) {
        return NextResponse.json({ error: result.error }, { status: 400 })
      }
      return NextResponse.json({ user: result.user, token: result.token })
    }

    if (action === 'signin') {
      if (!email || !password) {
        return NextResponse.json({ error: '邮箱和密码不能为空' }, { status: 400 })
      }
      const result = signIn(email, password)
      if ('error' in result) {
        return NextResponse.json({ error: result.error }, { status: 401 })
      }
      return NextResponse.json({ user: result.user, token: result.token })
    }

    if (action === 'verify') {
      if (!token) {
        return NextResponse.json({ error: '未提供 token' }, { status: 401 })
      }
      const user = verifyToken(token)
      if (!user) {
        return NextResponse.json({ error: 'token 无效或已过期' }, { status: 401 })
      }
      return NextResponse.json({ user })
    }

    return NextResponse.json({ error: '未知操作' }, { status: 400 })
  } catch (error: unknown) {
    console.error('Auth error:', error)
    const message = error instanceof Error ? error.message : '认证失败'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
