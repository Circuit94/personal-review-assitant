-- ============================================================
-- 记忆卡片功能：flashcards + flashcard_review_logs
-- 在 Supabase Dashboard > SQL Editor 中执行此脚本
-- ============================================================

-- 1. 创建 flashcards 表（记忆卡片主表）
CREATE TABLE flashcards (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL DEFAULT '',
  optimized_answer TEXT,                    -- AI 优化后的回答
  tags TEXT[] DEFAULT '{}',                 -- 标签数组，如 {'产品经理', '行为面试'}
  jd_reference TEXT,                        -- 参考的 JD 内容
  -- SM-2 算法字段
  ease_factor REAL DEFAULT 2.5,             -- 难度因子 (>=1.3)
  interval INTEGER DEFAULT 0,              -- 当前间隔天数
  repetitions INTEGER DEFAULT 0,           -- 连续正确次数
  next_review_at TIMESTAMPTZ DEFAULT NOW(), -- 下次复习时间
  -- 统计
  review_count INTEGER DEFAULT 0,          -- 总复习次数
  last_reviewed_at TIMESTAMPTZ,            -- 上次复习时间
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 创建 flashcard_review_logs 表（复习记录，用于绘制记忆曲线）
CREATE TABLE flashcard_review_logs (
  id TEXT PRIMARY KEY,
  flashcard_id TEXT NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quality INTEGER NOT NULL,                 -- 用户自评 0-5 (SM-2标准: 0=完全忘记, 5=完美记忆)
  ease_factor_before REAL,                  -- 复习前的 ease_factor
  ease_factor_after REAL,                   -- 复习后的 ease_factor
  interval_before INTEGER,                  -- 复习前的间隔
  interval_after INTEGER,                   -- 复习后的间隔
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 创建索引
CREATE INDEX idx_flashcards_user_id ON flashcards(user_id);
CREATE INDEX idx_flashcards_next_review ON flashcards(user_id, next_review_at);
CREATE INDEX idx_flashcards_tags ON flashcards USING GIN(tags);
CREATE INDEX idx_flashcard_review_logs_flashcard_id ON flashcard_review_logs(flashcard_id);
CREATE INDEX idx_flashcard_review_logs_user_id ON flashcard_review_logs(user_id);
CREATE INDEX idx_flashcard_review_logs_created_at ON flashcard_review_logs(created_at);
