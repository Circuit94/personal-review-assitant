# 开发者指南

本指南提供了如何扩展和自定义面试助手应用的信息。

## 开发环境设置

### 前置要求

- Node.js 18+
- npm 或 yarn 或 pnpm
- Git
- 文本编辑器（推荐 VS Code）

### 本地开发

```bash
# 1. 克隆仓库
git clone <your-repo-url>
cd interview-assistant

# 2. 安装依赖
npm install

# 3. 创建 .env.local 文件
cp .env.example .env.local

# 4. 填入你的凭证
# NEXT_PUBLIC_SUPABASE_URL=...
# NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# 5. 启动开发服务器
npm run dev

# 6. 访问 http://localhost:3000
```

## 代码结构详解

### API 路由设计

所有 API 路由都遵循以下模式：

```typescript
// app/api/example/route.ts
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    // 1. 解析请求
    const { data } = await req.json()

    // 2. 获取认证用户
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return new Response('Unauthorized', { status: 401 })
    }

    // 3. 处理业务逻辑
    // ...

    // 4. 返回响应
    return Response.json({ success: true, data: result })
  } catch (error) {
    console.error('Error:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}
```

### 组件设计模式

React 组件使用以下模式：

```typescript
'use client'  // 客户端组件

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

interface Props {
  // 定义 props 类型
}

export function MyComponent({ ...props }: Props) {
  // 状态管理
  const [state, setState] = useState('')
  const supabase = createClient()

  // 效果钩子
  useEffect(() => {
    // 初始化逻辑
  }, [supabase])

  // 事件处理
  const handleAction = async () => {
    // ...
  }

  // 渲染
  return (
    <div>
      <Button onClick={handleAction}>Action</Button>
    </div>
  )
}
```

## 添加新功能

### 案例：添加视频面试功能

#### 1. 更新数据库 Schema

```sql
-- scripts/002_add_video_interviews.sql
CREATE TABLE video_interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  duration INTEGER, -- 秒
  video_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE video_interviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own videos"
  ON video_interviews FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create videos"
  ON video_interviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

运行迁移：
```bash
# 在 Supabase SQL Editor 中手动运行
# 或使用脚本
psql $DATABASE_URL < scripts/002_add_video_interviews.sql
```

#### 2. 创建 API 路由

```typescript
// app/api/video-interviews/route.ts
import { put } from '@vercel/blob'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const title = formData.get('title') as string

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return new Response('Unauthorized', { status: 401 })

    // 上传视频到 Blob 存储
    const blob = await put(`videos/${user.id}/${file.name}`, file, {
      access: 'private',
    })

    // 保存到数据库
    const { error } = await supabase.from('video_interviews').insert({
      user_id: user.id,
      title,
      video_url: blob.pathname,
    })

    if (error) throw error

    return Response.json({ success: true, videoId: blob.pathname })
  } catch (error) {
    return new Response('Internal Server Error', { status: 500 })
  }
}
```

#### 3. 创建组件

```typescript
// components/video-interview.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export function VideoInterview() {
  const [uploading, setUploading] = useState(false)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('title', file.name)

      const response = await fetch('/api/video-interviews', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) throw new Error('Upload failed')

      toast.success('视频上传成功')
    } catch (error) {
      toast.error('上传失败')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <input
        type="file"
        accept="video/*"
        onChange={handleUpload}
        disabled={uploading}
      />
      <Button disabled={uploading}>
        {uploading ? '上传中...' : '上传视频'}
      </Button>
    </div>
  )
}
```

#### 4. 集成到仪表板

```typescript
// app/dashboard/page.tsx
import { VideoInterview } from '@/components/video-interview'

// 在 TabsContent 中添加
<TabsContent value="video">
  <VideoInterview />
</TabsContent>
```

## AI 功能扩展

### 使用 AI SDK 实现新的 AI 功能

```typescript
// app/api/analyze-answer/route.ts
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const { question, answer } = await req.json()

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return new Response('Unauthorized', { status: 401 })

    const result = await generateText({
      model: openai('gpt-4'),
      system: '你是专业的面试评估师。请评估用户的回答质量。',
      prompt: `
问题：${question}
回答：${answer}

请评估回答的质量，包括：
1. 相关性
2. 完整性
3. 专业性
4. 改进建议
      `,
    })

    // 保存评估到数据库
    // ...

    return Response.json({ analysis: result.text })
  } catch (error) {
    return new Response('Internal Server Error', { status: 500 })
  }
}
```

## 数据库最佳实践

### 1. 使用 RLS 保护数据

```sql
-- 为所有表启用 RLS
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- 创建基本的 CRUD 策略
CREATE POLICY "Users can view own data"
  ON table_name FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own data"
  ON table_name FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own data"
  ON table_name FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own data"
  ON table_name FOR DELETE
  USING (auth.uid() = user_id);
```

### 2. 添加索引提升性能

```sql
-- 为经常查询的字段创建索引
CREATE INDEX idx_user_created ON table_name(user_id, created_at DESC);
CREATE INDEX idx_interview_company ON interview_notes(company);
```

### 3. 使用触发器自动化

```sql
-- 自动更新修改时间
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_table_name_updated_at
  BEFORE UPDATE ON table_name
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
```

## 样式和主题自定义

### 修改颜色主题

编辑 `app/globals.css`：

```css
:root {
  /* 自定义颜色值 */
  --primary: oklch(0.55 0.21 259.75);
  --secondary: oklch(0.97 0 0);
  /* ... */
}

.dark {
  --primary: oklch(0.65 0.2 259.75);
  /* ... */
}
```

### 自定义字体

编辑 `app/layout.tsx`：

```typescript
import { Geist, Geist_Mono, YourFont } from 'next/font/google'

const yourFont = YourFont({ subsets: ['latin'] })

export default function RootLayout({ children }) {
  return (
    <html className={yourFont.className}>
      {/* ... */}
    </html>
  )
}
```

## 测试

### 单元测试

```typescript
// __tests__/utils.test.ts
import { expect, test } from '@jest/globals'
import { formatDate } from '@/lib/utils'

test('formatDate should format correctly', () => {
  const date = new Date('2024-01-01')
  expect(formatDate(date)).toBe('2024年1月1日')
})
```

### E2E 测试

```typescript
// e2e/auth.spec.ts
import { test, expect } from '@playwright/test'

test('user can sign up and login', async ({ page }) => {
  await page.goto('http://localhost:3000')
  await page.click('text=注册')
  
  await page.fill('input[type="email"]', 'test@example.com')
  await page.fill('input[type="password"]', 'password123')
  await page.click('button:has-text("注册")')
  
  await expect(page).toHaveURL('**/sign-up-success')
})
```

## 性能优化

### 1. 使用 React 的 Suspense

```typescript
import { Suspense } from 'react'

export default function Dashboard() {
  return (
    <Suspense fallback={<Loading />}>
      <AIChat />
    </Suspense>
  )
}
```

### 2. 实现虚拟化列表

对于大数据列表，使用虚拟化：

```typescript
import { FixedSizeList } from 'react-window'

export function InterviewNotesList({ notes }) {
  return (
    <FixedSizeList
      height={600}
      itemCount={notes.length}
      itemSize={100}
    >
      {({ index, style }) => (
        <div style={style}>
          {/* 渲染项目 */}
        </div>
      )}
    </FixedSizeList>
  )
}
```

### 3. 缓存策略

```typescript
// app/api/interview-notes/route.ts
export async function GET(req: Request) {
  // ...
  
  // 添加缓存头
  const response = Response.json(data)
  response.headers.set('Cache-Control', 'max-age=300, stale-while-revalidate=600')
  return response
}
```

## 部署前检查清单

- [ ] 所有环境变量已设置
- [ ] 数据库迁移已运行
- [ ] 测试通过（`npm run test`）
- [ ] 构建成功（`npm run build`）
- [ ] 无控制台错误或警告
- [ ] 移动设备响应式设计已验证
- [ ] 隐私政策和服务条款已准备
- [ ] 备份和恢复计划已制定

## 贡献指南

1. Fork 仓库
2. 创建功能分支：`git checkout -b feature/amazing-feature`
3. 提交更改：`git commit -m 'Add amazing feature'`
4. 推送分支：`git push origin feature/amazing-feature`
5. 提交 Pull Request

## 有用资源

- [Next.js 文档](https://nextjs.org/docs)
- [React 文档](https://react.dev)
- [Supabase 文档](https://supabase.com/docs)
- [AI SDK 文档](https://sdk.vercel.ai)
- [shadcn/ui 文档](https://ui.shadcn.com)
- [Tailwind CSS 文档](https://tailwindcss.com)

## 常见开发任务

### 添加新页面

```bash
# 创建页面目录
mkdir -p app/new-page

# 创建页面文件
touch app/new-page/page.tsx
```

### 添加新 UI 组件

```bash
# shadcn/ui 提供了许多现成的组件
# 复制相应的组件文件到 components/ui/
```

### 运行数据库迁移

```bash
# 创建新的迁移文件
touch scripts/NNN_migration_name.sql

# 在 Supabase SQL Editor 中运行
```

---

祝你的开发愉快！如有问题，请查看文档或提交 Issue。
