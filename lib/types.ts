// ============ 数据库表类型定义 ============

export interface Resume {
  id: string
  user_id: string
  file_name: string
  file_url: string
  file_type: string
  file_size: number
  extracted_text: string
  created_at: string
  updated_at: string
}

export interface InterviewRecord {
  id: string
  user_id: string
  title: string
  company: string
  position: string
  interview_date: string
  details: string
  created_at: string
  updated_at: string
}

export interface ChatSession {
  id: string
  user_id: string
  title: string
  session_type: 'chat' | 'mock_interview'
  position?: string
  created_at: string
  updated_at: string
}

export interface ChatMessage {
  id: string
  session_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  created_at: string
}

export interface MockInterviewQuestion {
  id: string
  session_id: string
  question_number: number
  question: string
  user_answer?: string
  ai_feedback?: string
  answered_at?: string
  created_at: string
}

export interface QASegment {
  role: 'interviewer' | 'candidate'
  content: string
  start_time?: number
  end_time?: number
}

export interface AudioAnalysis {
  duration?: number
  type?: string
  score?: number
  keywords?: string[]
  sentiment?: string
  summary?: string
  suggestions?: string[]
  dimensions?: RadarDimension[]
  error?: string
}

export interface RadarDimension {
  subject: string
  score: number
  fullMark: number
}

export interface AudioRecord {
  id: string
  user_id: string
  title: string
  file_url: string
  file_format: string
  file_size: number
  status: 'pending' | 'transcribing' | 'analyzing' | 'completed' | 'failed'
  transcription?: string
  qa_segments?: QASegment[]
  analysis?: AudioAnalysis
  created_at: string
  updated_at: string
}

export interface ReviewAnalysisRecord {
  id: string
  user_id: string
  analysis_type: string
  period_start: string
  period_end: string
  summary: string
  strengths: string[]
  weaknesses: string[]
  suggestions: string[]
  created_at: string
}
