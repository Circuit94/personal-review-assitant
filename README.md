# 面试助手 (Interview Review Assistant)

AI 驱动的面试准备平台，帮助求职者全方位提升面试表现。

## 功能特性

- **AI 面试辅导**：流式对话，实时获取面试技巧、简历优化、职业规划建议
- **模拟面试**：AI 根据目标岗位和简历生成针对性题目，提交后即时获得反馈
- **简历管理**：上传简历并提取文本，为 AI 分析提供基础数据
- **面试记录**：记录真实面试经历，积累复盘素材
- **录音智能分析**：上传面试录音，AI 自动转写、角色分离、多维度评分
- **复盘分析**：基于历史数据生成周度报告，追踪能力成长趋势

## 技术栈

- **前端**：Next.js 15 + React 19 + TypeScript + Tailwind CSS + shadcn/ui
- **后端**：Next.js API Routes + Supabase (PostgreSQL + Auth + Storage)
- **AI**：DeepSeek API（兼容 OpenAI 接口）+ Whisper（语音转写）
- **存储**：Vercel Blob（音频）+ Supabase Storage（简历）
- **部署**：Vercel

## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/Circuit94/personal-review-assitant.git
cd personal-review-assitant
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

```bash
cp .env.example .env.local
```

编辑 `.env.local`，填入你的 API Key：

- **DeepSeek API Key**：前往 [platform.deepseek.com](https://platform.deepseek.com) 获取
- **Supabase**：前往 [supabase.com](https://supabase.com) 创建项目，获取 URL 和 Key
- **Vercel Blob**（可选）：用于音频文件存储

### 4. 初始化数据库

在 Supabase SQL Editor 中执行 `supabase/migrations/` 目录下的 SQL 文件（按文件名顺序）。

### 5. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

## 项目结构

```
├── app/
│   ├── page.tsx                    # 登录/注册页
│   ├── layout.tsx                  # 根布局
│   ├── dashboard/page.tsx          # 主仪表板
│   └── api/                        # API Routes
│       ├── chat/                   # AI 聊天（流式响应）
│       ├── audio/upload/           # 音频上传
│       ├── audio/process/          # 音频转写+分析
│       ├── resume/extract/         # 简历文本提取
│       ├── generate-interview-questions/
│       ├── generate-review-analysis/
│       └── get-interview-feedback/
├── components/                     # React 组件
│   ├── AIChat.tsx                  # AI 聊天（流式打字机效果）
│   ├── AudioInterviewSystem.tsx    # 录音分析系统
│   ├── MockInterview.tsx           # 模拟面试（实时反馈）
│   ├── ResumeManager.tsx           # 简历管理
│   ├── InterviewRecords.tsx        # 面试记录
│   └── ReviewAnalysis.tsx          # 复盘分析
├── lib/
│   ├── openai.ts                   # AI 客户端配置
│   ├── types.ts                    # TypeScript 类型定义
│   ├── rate-limit.ts               # API 速率限制
│   ├── validate.ts                 # 输入校验
│   └── supabase/
│       ├── client.ts               # 前端 Supabase 客户端
│       └── server.ts               # 服务端 Supabase 客户端
└── supabase/migrations/            # 数据库迁移文件
```

## 使用 DeepSeek API

本项目默认使用 DeepSeek API，相比 OpenAI 成本降低 90%+。配置方式：

```env
OPENAI_API_KEY=sk-your-deepseek-key
OPENAI_API_BASE=https://api.deepseek.com/v1
OPENAI_MODEL=deepseek-chat
```

如需使用 OpenAI，修改为：

```env
OPENAI_API_KEY=sk-your-openai-key
OPENAI_API_BASE=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini
```

## 安全特性

- Row Level Security (RLS)：数据库层面确保用户只能访问自己的数据
- 前后端 Supabase 客户端分离：服务端使用 service_role_key
- API 速率限制：防止滥用和账单爆炸
- 输入校验：所有 API 接口对输入长度和格式进行校验
- 消息历史截断：避免超出 AI 模型上下文窗口

## License

MIT
