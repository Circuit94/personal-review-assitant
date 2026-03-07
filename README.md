# 面试助手 - AI 驱动的面试准备平台

一个现代化的面试准备助手应用，结合 AI 和数据持久化，帮助求职者有效准备面试。

## 功能特性

### 1. 简历管理
- 上传和管理 PDF 格式的简历
- 简历数据安全存储在 Vercel Blob 存储中
- AI 可基于简历提供针对性的建议

### 2. AI 聊天界面
- 与 GPT-4 驱动的 AI 面试教练对话
- AI 结合你的简历和面试历史提供个性化建议
- 实时流式响应，提供自然的对话体验
- 所有对话自动保存

### 3. 模拟面试
- 输入目标岗位信息
- AI 自动生成 5 道精心设计的面试题目
- 涵盖技能、经验、行为和问题解决等多个方面
- 逐题完成练习，建立自信

### 4. 面试记录
- 记录真实的面试经历
- 保存遇到的问题和自己的回答
- 积累面试经验数据库
- 便于后续复盘和改进

### 5. 复盘分析
- 自动分析近期面试记录和练习情况
- 生成周/月/定期的复盘报告
- 识别主要弱点和改进方向
- 获取具体的改进建议

## 技术栈

### 前端
- **Next.js 16** - React 框架，提供 App Router 和服务器组件
- **React 19** - 最新的 React 版本
- **TypeScript** - 类型安全的开发
- **Tailwind CSS v4** - 现代化的样式解决方案
- **shadcn/ui** - 高质量的 UI 组件库

### 后端与集成
- **Supabase** - 开源的 Firebase 替代品
  - PostgreSQL 数据库
  - 身份认证（邮箱/密码）
  - 行级安全 (RLS) 策略
- **Vercel Blob** - 无服务器对象存储
  - 安全存储 PDF 简历
  - 私有访问控制
- **OpenAI API** - GPT-4 模型
  - 对话生成
  - 面试题目生成
  - 复盘分析

### AI 框架
- **AI SDK v6** - Vercel 的 AI 框架
  - 流式文本生成
  - 结构化输出
  - 模型抽象化

## 项目结构

```
app/
├── page.tsx                 # 首页
├── auth/
│   ├── login/page.tsx      # 登录页面
│   ├── sign-up/page.tsx    # 注册页面
│   ├── sign-up-success/    # 注册成功页面
│   └── error/page.tsx      # 认证错误页面
├── dashboard/page.tsx       # 仪表板主页
├── api/
│   ├── chat/route.ts       # AI 聊天 API
│   ├── generate-interview-questions/route.ts  # 生成面试题目 API
│   ├── generate-review/route.ts                # 生成复盘分析 API
│   └── resume/route.ts                         # 获取简历 API
├── globals.css             # 全局样式和主题
└── layout.tsx              # 根布局

components/
├── resume-upload.tsx       # 简历上传组件
├── interview-notes.tsx     # 面试记录组件
├── ai-chat.tsx            # AI 聊天组件
├── mock-interview.tsx     # 模拟面试组件
├── interview-review.tsx   # 复盘分析组件
├── navbar.tsx             # 导航栏组件
└── ui/                    # shadcn/ui 组件

lib/
├── supabase/
│   ├── client.ts          # 浏览器 Supabase 客户端
│   ├── server.ts          # 服务器 Supabase 客户端
│   └── middleware.ts      # Supabase 中间件
└── utils.ts               # 工具函数

scripts/
└── 001_create_tables.sql  # 数据库迁移脚本
```

## 数据库 Schema

### 表结构

- **resumes** - 用户简历
  - id, user_id, filename, url, file_size, created_at

- **interview_notes** - 面试记录
  - id, user_id, company, position, notes, created_at

- **chat_messages** - 聊天消息（自动保存）
  - id, user_id, session_id, role, content, created_at

- **mock_interviews** - 模拟面试会话
  - id, user_id, job_title, job_description, questions, created_at

- **interview_reviews** - 复盘分析报告
  - id, user_id, review_content, review_period_days, created_at

## 环境变量

创建 `.env.local` 文件并设置以下环境变量：

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Vercel Blob（自动配置）
BLOB_READ_WRITE_TOKEN=your_blob_token

# OpenAI（如果不使用 Vercel AI Gateway）
OPENAI_API_KEY=your_openai_key
```

## 快速开始

### 1. 克隆和安装

```bash
git clone <repository>
cd interview-assistant
npm install
```

### 2. 设置 Supabase

- 在 [supabase.com](https://supabase.com) 创建账户
- 创建新项目
- 运行迁移脚本创建表
- 复制项目 URL 和 API Key

### 3. 配置环境变量

```bash
cp .env.example .env.local
# 编辑 .env.local 并填入你的 Supabase 凭证
```

### 4. 启动开发服务器

```bash
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000) 访问应用。

## 使用指南

### 第一次使用

1. 访问首页并点击"注册"
2. 使用邮箱和密码创建账户
3. 完成邮箱验证
4. 登录到仪表板

### 准备面试

1. **上传简历** - 在"简历管理"标签页上传 PDF 简历
2. **记录经历** - 在"面试记录"标签页记录已参加的面试
3. **AI 咨询** - 在"AI 聊天"标签页与 AI 讨论面试准备
4. **模拟练习** - 在"模拟面试"标签页进行实时练习
5. **复盘总结** - 在"复盘分析"标签页查看进度和建议

## 最佳实践

- **定期更新简历** - 确保 AI 获得最新的个人信息
- **记录详细笔记** - 面试记录越详细，AI 分析越准确
- **定期复盘** - 定期生成周复盘来追踪进度
- **充分利用 AI** - 提出具体的问题获得更好的建议

## API 文档

### POST /api/chat

AI 聊天端点，支持流式响应。

**请求体：**
```json
{
  "messages": [
    { "role": "user", "content": "...", "id": "..." }
  ],
  "resumeContent": "...",
  "interviewHistory": "..."
}
```

### POST /api/generate-interview-questions

生成面试题目。

**请求体：**
```json
{
  "jobTitle": "前端工程师",
  "jobDescription": "..."
}
```

**响应：**
```json
{
  "sessionId": "...",
  "questions": [
    {
      "question": "...",
      "difficulty": "medium",
      "category": "技能"
    }
  ]
}
```

### POST /api/generate-review

生成复盘分析。

**请求体：**
```json
{
  "daysBack": 7
}
```

## 贡献指南

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License

## 支持

有问题或建议？请通过以下方式联系：
- 提交 GitHub Issue
- 发送邮件至 support@example.com

---

祝你面试顺利！
