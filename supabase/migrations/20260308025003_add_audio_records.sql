-- 创建音频面试记录表
CREATE TABLE IF NOT EXISTS interview_audio_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_format TEXT NOT NULL, -- 'mp3', 'wav', 'm4a'
  file_size BIGINT NOT NULL, -- 文件大小（字节）
  status TEXT DEFAULT 'pending', -- 'pending', 'transcribing', 'analyzing', 'completed', 'failed'
  transcription TEXT, -- 原始转写文本
  qa_segments JSONB, -- 问答片段 [{role: 'interviewer' | 'candidate', content: '...', start_time: 0, end_time: 0}]
  analysis JSONB, -- 深度分析结果 {duration: 0, type: 'technical', score: 85, keywords: [], sentiment: 'positive', suggestions: []}
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE interview_audio_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own audio records"
  ON interview_audio_records FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own audio records"
  ON interview_audio_records FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own audio records"
  ON interview_audio_records FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own audio records"
  ON interview_audio_records FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_interview_audio_records_user_id ON interview_audio_records(user_id);
