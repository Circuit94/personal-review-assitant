'use client'

// 前端 API 客户端，替代 Supabase SDK

const TOKEN_KEY = 'auth_token'
const USER_KEY = 'auth_user'

export interface User {
  id: string
  email: string
}

// ============ Auth ============

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

export function getUser(): User | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function setAuth(user: User, token: string) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export async function signIn(email: string, password: string): Promise<{ user: User; token: string }> {
  const res = await fetch('/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'signin', email, password }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '登录失败')
  setAuth(data.user, data.token)
  return data
}

export async function signUp(email: string, password: string): Promise<{ user: User; token: string }> {
  const res = await fetch('/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'signup', email, password }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '注册失败')
  setAuth(data.user, data.token)
  return data
}

export async function verifySession(): Promise<User | null> {
  const token = getToken()
  if (!token) return null
  try {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'verify', token }),
    })
    if (!res.ok) {
      clearAuth()
      return null
    }
    const data = await res.json()
    return data.user
  } catch {
    clearAuth()
    return null
  }
}

export function signOut() {
  clearAuth()
  window.location.href = '/'
}

// ============ API Helpers ============

function authHeaders(): Record<string, string> {
  const token = getToken()
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: authHeaders() })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || `请求失败: ${res.status}`)
  }
  return res.json()
}

async function apiPost<T>(url: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || `请求失败: ${res.status}`)
  }
  return res.json()
}

async function apiPut<T>(url: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(url, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || `请求失败: ${res.status}`)
  }
  return res.json()
}

async function apiDelete(url: string): Promise<void> {
  const res = await fetch(url, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || `删除失败: ${res.status}`)
  }
}

// ============ Data APIs ============

export const api = {
  // Stats
  getStats: () => apiGet<{ resumes: number; interviews: number; chats: number; audios: number }>('/api/data/stats'),

  // Resumes
  getResumes: () => apiGet<Record<string, unknown>[]>('/api/data/resumes'),
  createResume: (data: { file_name: string; file_url?: string; extracted_text?: string }) =>
    apiPost<Record<string, unknown>>('/api/data/resumes', data),
  updateResume: (data: { id: string; extracted_text?: string; file_name?: string }) =>
    apiPut<Record<string, unknown>>('/api/data/resumes', data),
  deleteResume: (id: string) => apiDelete(`/api/data/resumes?id=${id}`),

  // Interview Records
  getInterviewRecords: () => apiGet<Record<string, unknown>[]>('/api/data/interview-records'),
  createInterviewRecord: (data: { title: string; company?: string; position?: string; interview_date?: string; content?: string; stage?: string }) =>
    apiPost<Record<string, unknown>>('/api/data/interview-records', data),
  updateInterviewRecord: (data: { id: string; title?: string; company?: string; position?: string; interview_date?: string; content?: string; stage?: string }) =>
    apiPut<Record<string, unknown>>('/api/data/interview-records', data),
  deleteInterviewRecord: (id: string) => apiDelete(`/api/data/interview-records?id=${id}`),

  // Chat Sessions
  getChatSessions: (type?: string) => apiGet<Record<string, unknown>[]>(`/api/data/chat-sessions?type=${type || 'chat'}`),
  createChatSession: (data: { session_type?: string; title?: string; position?: string }) =>
    apiPost<Record<string, unknown>>('/api/data/chat-sessions', data),
  deleteChatSession: (id: string) => apiDelete(`/api/data/chat-sessions?id=${id}`),

  // Chat Messages
  getChatMessages: (sessionId: string) => apiGet<Record<string, unknown>[]>(`/api/data/chat-messages?session_id=${sessionId}`),
  createChatMessage: (data: { session_id: string; role: string; content: string }) =>
    apiPost<Record<string, unknown>>('/api/data/chat-messages', data),

  // Mock Interview Questions
  getMockQuestions: (sessionId: string) => apiGet<Record<string, unknown>[]>(`/api/data/mock-questions?session_id=${sessionId}`),
  createMockQuestions: (data: { session_id: string; questions: { question: string; question_number: number }[] }) =>
    apiPost<Record<string, unknown>[]>('/api/data/mock-questions', data),
  updateMockQuestion: (data: { id: string; user_answer?: string; ai_feedback?: string }) =>
    apiPut<Record<string, unknown>>('/api/data/mock-questions', data),

  // Review Analyses
  getReviewAnalyses: () => apiGet<Record<string, unknown>[]>('/api/data/review-analyses'),
  createReviewAnalysis: (data: Record<string, unknown>) =>
    apiPost<Record<string, unknown>>('/api/data/review-analyses', data),

  // Audio Records
  getAudioRecords: () => apiGet<Record<string, unknown>[]>('/api/data/audio-records'),
  createAudioRecord: (data: { file_url: string; file_name?: string }) =>
    apiPost<Record<string, unknown>>('/api/data/audio-records', data),
  updateAudioRecord: (data: { id: string; status?: string; transcription?: string; qa_segments?: unknown; analysis?: unknown }) =>
    apiPut<Record<string, unknown>>('/api/data/audio-records', data),

  // Personal Info Bank
  getInfoModules: () => apiGet<Record<string, unknown>[]>('/api/data/info-modules'),
  createInfoModule: (data: { name: string; icon?: string; fields?: { label: string; value?: string }[] }) =>
    apiPost<Record<string, unknown>>('/api/data/info-modules', data),
  updateInfoModule: (data: { id: string; name?: string; icon?: string }) =>
    apiPut<Record<string, unknown>>('/api/data/info-modules', data),
  deleteInfoModule: (id: string) => apiDelete(`/api/data/info-modules?id=${id}`),

  createInfoField: (data: { module_id: string; label: string; value?: string }) =>
    apiPost<Record<string, unknown>>('/api/data/info-fields', data),
  updateInfoField: (data: { id: string; label?: string; value?: string }) =>
    apiPut<Record<string, unknown>>('/api/data/info-fields', data),
  deleteInfoField: (id: string) => apiDelete(`/api/data/info-fields?id=${id}`),

  createInfoAttachment: (data: { module_id: string; file_name: string; file_url: string; file_size?: number }) =>
    apiPost<Record<string, unknown>>('/api/data/info-attachments', data),
  deleteInfoAttachment: (id: string) => apiDelete(`/api/data/info-attachments?id=${id}`),

  // File Upload
  uploadFile: async (file: File, type: 'resumes' | 'audio' | 'info' = 'resumes') => {
    const token = getToken()
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', type)

    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || '上传失败')
    }
    return res.json() as Promise<{ url: string; fileName: string; size: number }>
  },

  // AI Chat (streaming)
  chat: async (messages: { role: string; content: string }[]) => {
    const token = getToken()
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ messages }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || 'AI 响应失败')
    }
    return res
  },
}
