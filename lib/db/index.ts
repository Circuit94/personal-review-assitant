import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

let _db: InstanceType<typeof Database> | null = null

function getDb(): InstanceType<typeof Database> {
  if (_db) return _db

  const DB_PATH = path.join(process.cwd(), 'data', 'app.db')

  // 确保 data 目录存在
  const dataDir = path.dirname(DB_PATH)
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }

  _db = new Database(DB_PATH)

  // 启用 WAL 模式提升并发性能
  _db.pragma('journal_mode = WAL')
  _db.pragma('foreign_keys = ON')

  // 初始化表结构
  _db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS resumes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      file_name TEXT NOT NULL,
      file_url TEXT,
      extracted_text TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS interview_records (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      title TEXT NOT NULL,
      company TEXT,
      position TEXT,
      interview_date TEXT,
      content TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS chat_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      session_type TEXT NOT NULL DEFAULT 'chat',
      title TEXT,
      position TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS mock_interview_questions (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
      question_number INTEGER NOT NULL,
      question TEXT NOT NULL,
      user_answer TEXT,
      ai_feedback TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS review_analyses (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      analysis_type TEXT NOT NULL DEFAULT 'weekly',
      period_start TEXT,
      period_end TEXT,
      summary TEXT,
      strengths TEXT,
      weaknesses TEXT,
      suggestions TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS interview_audio_records (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      file_url TEXT NOT NULL,
      file_name TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      transcription TEXT,
      qa_segments TEXT,
      analysis TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `)

  // 个人信息库表
  _db.exec(`
    CREATE TABLE IF NOT EXISTS info_modules (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      name TEXT NOT NULL,
      icon TEXT DEFAULT '📋',
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS info_fields (
      id TEXT PRIMARY KEY,
      module_id TEXT NOT NULL REFERENCES info_modules(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id),
      label TEXT NOT NULL,
      value TEXT DEFAULT '',
      field_type TEXT DEFAULT 'text',
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS info_attachments (
      id TEXT PRIMARY KEY,
      module_id TEXT NOT NULL REFERENCES info_modules(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id),
      file_name TEXT NOT NULL,
      file_url TEXT NOT NULL,
      file_size INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `)

  return _db
}

// 使用 Proxy 实现透明的延迟初始化
const db = new Proxy({} as InstanceType<typeof Database>, {
  get(_target, prop) {
    const instance = getDb()
    const value = (instance as unknown as Record<string | symbol, unknown>)[prop]
    if (typeof value === 'function') {
      return (value as Function).bind(instance)
    }
    return value
  },
})

export default db
