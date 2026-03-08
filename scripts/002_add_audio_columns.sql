-- 为面试记录表添加音频和AI分析相关字段
ALTER TABLE interview_records ADD COLUMN IF NOT EXISTS audio_file_name TEXT;
ALTER TABLE interview_records ADD COLUMN IF NOT EXISTS transcription TEXT;
ALTER TABLE interview_records ADD COLUMN IF NOT EXISTS ai_analysis TEXT;
