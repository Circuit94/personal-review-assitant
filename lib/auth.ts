import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import db from './db'

const JWT_SECRET = process.env.JWT_SECRET || 'local-dev-secret-change-in-production'
const TOKEN_EXPIRY = '7d'

export interface AuthUser {
  id: string
  email: string
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10)
}

export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash)
}

export function generateToken(user: AuthUser): string {
  return jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
    expiresIn: TOKEN_EXPIRY,
  })
}

export function verifyToken(token: string): AuthUser | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser
    return { id: decoded.id, email: decoded.email }
  } catch {
    return null
  }
}

export function getUserFromRequest(req: Request): AuthUser | null {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.slice(7)
  return verifyToken(token)
}

export function signUp(email: string, password: string): { user: AuthUser; token: string } | { error: string } {
  // 检查邮箱是否已存在
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as { id: string } | undefined
  if (existing) {
    return { error: '该邮箱已注册' }
  }

  const id = uuidv4()
  const passwordHash = hashPassword(password)

  db.prepare('INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)').run(id, email, passwordHash)

  const user: AuthUser = { id, email }
  const token = generateToken(user)
  return { user, token }
}

export function signIn(email: string, password: string): { user: AuthUser; token: string } | { error: string } {
  const row = db.prepare('SELECT id, email, password_hash FROM users WHERE email = ?').get(email) as
    | { id: string; email: string; password_hash: string }
    | undefined

  if (!row) {
    return { error: '邮箱或密码错误' }
  }

  if (!verifyPassword(password, row.password_hash)) {
    return { error: '邮箱或密码错误' }
  }

  const user: AuthUser = { id: row.id, email: row.email }
  const token = generateToken(user)
  return { user, token }
}
