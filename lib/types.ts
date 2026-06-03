// ============ 数据库表类型定义 ============

export interface Resume {
  id: string
  user_id: string
  file_name: string
  file_url: string
  file_type: string
  file_size: number
  extracted_text: string
  version_label: string       // 版本标签，如 "互联网版"、"国企版"
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
}

export interface AudioAnalysis {
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
  status: 'analyzing' | 'completed' | 'failed'
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

// ============ 模拟面试增强类型 ============

export interface MockInterviewSettings {
  position: string
  skipIntro: boolean          // 跳过自我介绍
  focusAreas: string[]        // 重点考察方向，如 '项目经验'、'技术深度'、'行为面试'
  difficulty: 'easy' | 'medium' | 'hard'
  questionCount: number       // 预计问题数
  customInstructions?: string // 用户自定义指令
}

export interface InterviewFeedback {
  score: number               // 0-100
  framework: string           // 回答框架分析（如 STAR 法则使用情况）
  strengths: string[]
  improvements: string[]
  optimizedAnswer: string     // AI 优化版答案
}

export interface InterviewOption {
  id: string
  label: string               // 如 "追问项目细节"、"换方向提问"、"结束面试"
  type: 'followup' | 'switch_topic' | 'end' | 'custom'
}

export interface MockInterviewMessage {
  role: 'interviewer' | 'candidate'
  content: string
  timestamp: number
  feedback?: InterviewFeedback  // 候选人回答后的实时反馈
  options?: InterviewOption[]   // 面试官提问后的选项
}

export interface MockInterviewRecord {
  id: string
  user_id: string
  position: string
  settings: MockInterviewSettings
  messages: MockInterviewMessage[]
  overall_score: number
  overall_feedback: string
  dimensions: { name: string; score: number }[]
  duration: number            // 秒
  question_count: number
  created_at: string
  updated_at: string
}

// ============ 记忆卡片类型 ============

export interface Flashcard {
  id: string
  user_id: string
  question: string
  answer: string
  optimized_answer?: string
  tags: string[]
  jd_reference?: string
  // SM-2 算法字段
  ease_factor: number
  interval: number
  repetitions: number
  next_review_at: string
  // 统计
  review_count: number
  last_reviewed_at?: string
  created_at: string
  updated_at: string
}

export interface FlashcardReviewLog {
  id: string
  flashcard_id: string
  user_id: string
  quality: number              // 0-5
  ease_factor_before: number
  ease_factor_after: number
  interval_before: number
  interval_after: number
  created_at: string
}

export type ReviewQuality = 0 | 1 | 2 | 3 | 4 | 5

export interface SprintTask {
  time: string
  title: string
  description: string
  checklist: string[]
}

export interface SprintData {
  company_brief: string
  tasks: SprintTask[]
  key_questions: string[]
  talking_points: string[]
  red_flags: string[]
  reverse_questions: string[]
  raw?: string
}

export interface SprintRecord {
  id: string
  user_id: string
  company: string
  position: string
  sprint_data: SprintData
  created_at: string
  updated_at: string
}
