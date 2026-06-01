-- 模拟面试记录表
-- 在 Supabase SQL Editor 中执行

CREATE TABLE IF NOT EXISTS mock_interview_records (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  user_id TEXT NOT NULL,
  position TEXT NOT NULL,
  settings JSONB NOT NULL DEFAULT '{}',
  messages JSONB NOT NULL DEFAULT '[]',
  overall_score INTEGER DEFAULT 0,
  overall_feedback TEXT DEFAULT '',
  dimensions JSONB DEFAULT '[]',
  duration INTEGER DEFAULT 0,
  question_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_mock_interview_records_user_id ON mock_interview_records(user_id);
CREATE INDEX IF NOT EXISTS idx_mock_interview_records_created_at ON mock_interview_records(created_at DESC);

-- 更新 updated_at 触发器
CREATE OR REPLACE FUNCTION update_mock_interview_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_mock_interview_records_updated_at ON mock_interview_records;
CREATE TRIGGER trigger_mock_interview_records_updated_at
  BEFORE UPDATE ON mock_interview_records
  FOR EACH ROW
  EXECUTE FUNCTION update_mock_interview_records_updated_at();
