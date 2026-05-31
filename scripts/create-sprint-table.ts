/**
 * 创建 interview_sprint_records 表
 * 用法: npx tsx scripts/create-sprint-table.ts
 * 需设置环境变量: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('请设置 NEXT_PUBLIC_SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY 环境变量')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function createTable() {
  const { error } = await supabase.rpc('exec_sql', {
    sql: `
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
    `,
  })

  if (error) {
    // 如果 rpc 不可用，尝试直接用 REST
    console.log('rpc 方式不可用, 尝试直接 fetch SQL...')
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        sql: `
          CREATE TABLE IF NOT EXISTS interview_sprint_records (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            company TEXT,
            position TEXT,
            sprint_data JSONB NOT NULL DEFAULT '{}',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `,
      }),
    })

    if (!res.ok) {
      console.error('创建表失败。请在 Supabase SQL Editor 中手动执行以下 SQL:')
      console.log(`
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
      `)
      return
    }
    console.log('✅ 表创建成功')
    return
  }

  console.log('✅ interview_sprint_records 表创建成功')
}

createTable().catch(console.error)
