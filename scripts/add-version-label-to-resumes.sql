-- 为 resumes 表添加 version_label 列
-- 在 Supabase SQL Editor 中执行: https://supabase.com/dashboard/project/cpkromdfsnvpjvoneuek/sql/new

ALTER TABLE resumes ADD COLUMN IF NOT EXISTS version_label TEXT DEFAULT '默认';

-- 更新已有记录的标签为"默认"
UPDATE resumes SET version_label = '默认' WHERE version_label IS NULL;
