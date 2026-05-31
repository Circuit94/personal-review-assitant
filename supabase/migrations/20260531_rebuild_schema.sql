-- ============================================================
-- 重建 Supabase 表结构（使用 TEXT 类型主键和 user_id）
-- 在 Supabase Dashboard > SQL Editor 中执行此脚本
-- ============================================================

-- 1. 删除现有表（按依赖顺序）
DROP TABLE IF EXISTS mock_interview_questions CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS review_analyses CASCADE;
DROP TABLE IF EXISTS chat_sessions CASCADE;
DROP TABLE IF EXISTS interview_records CASCADE;
DROP TABLE IF EXISTS resumes CASCADE;
DROP TABLE IF EXISTS interview_audio_records CASCADE;
DROP TABLE IF EXISTS info_attachments CASCADE;
DROP TABLE IF EXISTS info_fields CASCADE;
DROP TABLE IF EXISTS info_modules CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 2. 创建 users 表（自管理认证）
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 创建 resumes 表
CREATE TABLE resumes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT,
  extracted_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 创建 interview_records 表
CREATE TABLE interview_records (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  company TEXT,
  position TEXT,
  interview_date TEXT,
  stage TEXT DEFAULT 'applied',
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 创建 chat_sessions 表
CREATE TABLE chat_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_type TEXT NOT NULL DEFAULT 'chat',
  title TEXT,
  position TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. 创建 chat_messages 表
CREATE TABLE chat_messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. 创建 mock_interview_questions 表
CREATE TABLE mock_interview_questions (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  question_number INTEGER NOT NULL,
  question TEXT NOT NULL,
  user_answer TEXT,
  ai_feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. 创建 review_analyses 表
CREATE TABLE review_analyses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  analysis_type TEXT NOT NULL DEFAULT 'weekly',
  period_start TEXT,
  period_end TEXT,
  summary TEXT,
  strengths TEXT,
  weaknesses TEXT,
  suggestions TEXT,
  metrics TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. 创建 interview_audio_records 表
CREATE TABLE interview_audio_records (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  transcription TEXT,
  qa_segments TEXT,
  analysis TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. 创建 info_modules 表
CREATE TABLE info_modules (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '📋',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. 创建 info_fields 表
CREATE TABLE info_fields (
  id TEXT PRIMARY KEY,
  module_id TEXT NOT NULL REFERENCES info_modules(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  value TEXT DEFAULT '',
  field_type TEXT DEFAULT 'text',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. 创建 info_attachments 表
CREATE TABLE info_attachments (
  id TEXT PRIMARY KEY,
  module_id TEXT NOT NULL REFERENCES info_modules(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. 创建索引
CREATE INDEX idx_resumes_user_id ON resumes(user_id);
CREATE INDEX idx_interview_records_user_id ON interview_records(user_id);
CREATE INDEX idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX idx_mock_questions_session_id ON mock_interview_questions(session_id);
CREATE INDEX idx_review_analyses_user_id ON review_analyses(user_id);
CREATE INDEX idx_audio_records_user_id ON interview_audio_records(user_id);
CREATE INDEX idx_info_modules_user_id ON info_modules(user_id);
CREATE INDEX idx_info_fields_module_id ON info_fields(module_id);
CREATE INDEX idx_info_fields_user_id ON info_fields(user_id);
CREATE INDEX idx_info_attachments_module_id ON info_attachments(module_id);
