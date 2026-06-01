-- 创建 interview_sprint_records 表
-- 在 Supabase SQL Editor 中执行: https://supabase.com/dashboard/project/cpkromdfsnvpjvoneuek/sql/new

CREATE TABLE IF NOT EXISTS interview_sprint_records (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  company TEXT,
  position TEXT,
  sprint_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sprint_records_user_id ON interview_sprint_records(user_id);
CREATE INDEX IF NOT EXISTS idx_sprint_records_created_at ON interview_sprint_records(created_at DESC);
