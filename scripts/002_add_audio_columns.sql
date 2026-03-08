-- Add audio transcription and AI analysis columns to interview_notes table
ALTER TABLE interview_notes
  ADD COLUMN IF NOT EXISTS audio_url TEXT,
  ADD COLUMN IF NOT EXISTS transcription TEXT,
  ADD COLUMN IF NOT EXISTS ai_analysis TEXT;
