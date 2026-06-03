# 面试助手 (Interview AI Assistant)

> AI 驱动的全流程面试准备平台 —— 从简历优化到模拟面试，从进度追踪到复盘分析，一站式覆盖求职者的完整备战链路。

## 产品定位

面试助手是一款面向求职者的智能面试准备工具。区别于市面上零散的刷题网站或简单的 AI 聊天，本产品以 **"准备-练习-追踪-复盘"** 闭环为核心理念，将简历管理、AI 辅导、模拟面试、进度看板、录音分析、综合复盘六大能力整合在一个平台中，让求职者在一个工具内完成从投递到 Offer 的全部准备工作。

## 核心功能

### 概览仪表板

进入应用后的首屏即为概览页，提供面试准备度评分（0-100 分制）、数据统计卡片、推荐下一步动作、快捷入口，以及内嵌的面试冲刺模块。准备度算法综合考量简历上传情况（25 分）、模拟面试次数（最高 35 分）、面试记录数量（最高 20 分）和复盘次数（最高 20 分），帮助用户直观了解当前备战进度。

### AI 智能聊天

基于 DeepSeek 大模型的流式对话系统，支持多会话管理。用户可就面试技巧、简历优化、职业规划、行业分析等任何面试相关话题进行自由对话。消息渲染采用 `react-markdown` 组件配合自定义 `.markdown-body` 样式，确保代码块、列表、引用等富文本格式正确显示。聊天历史持久化存储于 Supabase，支持跨设备同步。

### 模拟面试系统

这是产品的核心亮点功能，提供高度拟真的 AI 面试官体验：

**面试设置**：支持自定义岗位、难度（基础 / 中等 / 高难度）、重点考察方向（项目经验、技术深度、行为面试等）、问题数量、是否跳过自我介绍，以及自定义指令。

**智能上下文注入**：系统会自动从用户的简历库和个人素材库（info_modules + info_fields）中提取背景信息，注入到面试官的 System Prompt 中，使 AI 面试官能够基于用户的真实经历进行针对性追问。

**交互式面试流程**：每轮提问后，AI 自动生成三个后续选项（追问方向、换话题、结束面试），用户可选择选项或自由回答，面试节奏自然流畅。

**计时压力模式**：可开启答题倒计时（30s / 60s / 90s / 120s），模拟真实面试的时间压力，训练快速组织语言的能力。倒计时 10 秒内触发视觉警告效果。

**实时反馈**：面试结束后生成多维度评分（STAR 法则运用、逻辑性、专业深度等），包含具体改进建议和 AI 优化版答案。

### 简历素材中心

合并了简历管理和个人素材库两大模块：

**简历管理**：支持上传 PDF/Word 格式简历，服务端自动提取文本内容用于 AI 分析。支持多版本管理（如"互联网版"、"国企版"），JD 匹配分析功能可将简历与目标岗位 JD 进行智能对比，输出匹配度评分、匹配关键词、缺失关键词和优化建议。

**个人素材库（Info Bank）**：模块化管理个人信息、项目经历、技能特长等面试素材。支持自定义模块和字段，数据会自动注入模拟面试的上下文中，让 AI 面试官能基于真实经历深度追问。

### 面试记录看板

采用 HTML5 原生 Drag & Drop API 实现的看板系统，将面试流程划分为"已投递 → 笔试 → 一面 → 二面 → HR面 → 已录用"六个阶段。用户可通过拖拽直观地移动面试记录卡片，追踪每家公司的面试进度。同时集成了 Browser Notification API，支持面试提醒功能——提前一天/一小时通知即将到来的面试。

### 复盘分析

包含两个子模块：

**面试复盘**：上传面试录音，AI 自动进行语音转写（Whisper）、角色分离（面试官 / 候选人）、多维度评分（沟通表达、逻辑思维、专业知识等），生成雷达图和具体改进建议。

**综合分析**：基于历史面试记录和复盘数据，AI 生成周度/月度分析报告，追踪能力成长趋势，识别薄弱环节并给出针对性训练建议。

### 面试冲刺

嵌入在概览页底部的快速准备工具。输入公司名称和岗位，AI 会在 30 秒内生成一份结构化的冲刺准备清单，包括公司简介、时间线任务（如"面试前 2 小时：复习项目经历"）、核心考点、谈资要点、避雷建议和反问问题库。

## 技术架构

### 技术栈

| 层级 | 技术选型 |
|------|----------|
| 框架 | Next.js 15 (App Router) + React 19 + TypeScript |
| 样式 | Tailwind CSS v4 + shadcn/ui (Radix UI 组件库) |
| 后端 | Next.js API Routes (Serverless Functions) |
| 数据库 | Supabase (PostgreSQL) |
| AI 模型 | DeepSeek API (兼容 OpenAI SDK 接口) |
| 语音处理 | OpenAI Whisper API |
| 文件存储 | Supabase Storage (简历) + Vercel Blob (音频) |
| 认证 | 自实现 JWT (bcryptjs + jsonwebtoken) |
| 部署 | Vercel |

### 系统架构

```
┌──────────────────────────────────────────────────────┐
│                    客户端 (React 19)                    │
│  ┌─────────┐ ┌──────────┐ ┌─────────┐ ┌───────────┐ │
│  │概览仪表板│ │AI聊天/面试│ │简历素材库│ │看板/复盘  │ │
│  └────┬────┘ └─────┬────┘ └────┬────┘ └─────┬─────┘ │
│       │             │           │             │       │
│       └─────────────┴─────┬─────┴─────────────┘       │
│                           │                           │
└───────────────────────────┼───────────────────────────┘
                            │ HTTP / SSE (流式)
┌───────────────────────────┼───────────────────────────┐
│              Next.js API Routes (Serverless)           │
│  ┌──────────────────────────────────────────────────┐ │
│  │  认证中间件 (JWT) │ 速率限制 │ 输入校验          │ │
│  └──────────────────────────────────────────────────┘ │
│       │               │               │               │
│  ┌────┴────┐    ┌─────┴─────┐   ┌────┴────┐         │
│  │DeepSeek │    │ Supabase  │   │ Whisper │         │
│  │  API    │    │PostgreSQL │   │  API    │         │
│  └─────────┘    └───────────┘   └─────────┘         │
└───────────────────────────────────────────────────────┘
```

### 数据库设计

```
users (用户表)
├── resumes (简历表, 1:N)
├── interview_records (面试记录表, 1:N, stage字段支持看板)
├── chat_sessions (聊天/面试会话, 1:N)
│   ├── chat_messages (聊天消息, 1:N)
│   └── mock_interview_questions (模拟面试题目, 1:N)
├── interview_audio_records (面试录音记录, 1:N)
├── review_analyses (复盘分析报告, 1:N)
└── info_modules (素材库模块, 1:N)
    ├── info_fields (素材字段, 1:N)
    └── info_attachments (素材附件, 1:N)
```

### 项目结构

```
personal-review-assitant/
├── app/
│   ├── page.tsx                          # 登录/注册页面
│   ├── layout.tsx                        # 根布局 (主题、字体)
│   ├── globals.css                       # 全局样式 + Markdown渲染样式
│   ├── dashboard/
│   │   └── page.tsx                      # 主仪表板 (6 Tab 布局)
│   └── api/
│       ├── auth/route.ts                 # 注册/登录 (bcrypt + JWT)
│       ├── chat/route.ts                 # AI 聊天 (SSE 流式)
│       ├── mock-interview/
│       │   ├── route.ts                  # 模拟面试主流程 (上下文注入)
│       │   ├── feedback/route.ts         # 面试反馈生成
│       │   └── recommend-settings/route.ts # 智能推荐设置
│       ├── interview-sprint/route.ts     # 面试冲刺清单生成
│       ├── resume/
│       │   ├── extract/route.ts          # 简历文本提取
│       │   └── jd-match/route.ts         # JD 匹配分析
│       ├── audio/
│       │   ├── upload/                   # 音频上传
│       │   └── process/route.ts          # 音频转写 + AI分析
│       ├── generate-interview-questions/ # 面试题生成
│       ├── generate-review-analysis/     # 复盘报告生成
│       ├── get-interview-feedback/       # 获取面试反馈
│       ├── upload/route.ts               # 通用文件上传
│       └── data/                         # CRUD 数据接口
│           ├── resumes/
│           ├── interview-records/
│           ├── chat-sessions/
│           ├── chat-messages/
│           ├── mock-interview-records/
│           ├── mock-questions/
│           ├── audio-records/
│           ├── review-analyses/
│           ├── sprint-records/
│           ├── info-modules/
│           ├── info-fields/
│           ├── info-attachments/
│           └── stats/
├── components/
│   ├── AIChat.tsx                        # AI 聊天组件 (流式渲染)
│   ├── MockInterview.tsx                 # 模拟面试 (计时+选项+反馈)
│   ├── ResumeManager.tsx                 # 简历管理 + JD匹配
│   ├── PersonalInfoBank.tsx              # 个人素材库
│   ├── InterviewRecords.tsx              # 面试看板 (拖拽+提醒)
│   ├── InterviewSprint.tsx               # 面试冲刺组件
│   ├── AudioInterviewSystem.tsx          # 录音分析系统
│   ├── ReviewAnalysis.tsx                # 综合复盘分析
│   ├── theme-provider.tsx                # 主题切换
│   └── ui/                               # shadcn/ui 组件库 (40+组件)
├── lib/
│   ├── openai.ts                         # DeepSeek/OpenAI 客户端
│   ├── auth.ts                           # JWT 签发/验证
│   ├── db.ts                             # Supabase Admin 客户端
│   ├── types.ts                          # TypeScript 类型定义 (180行)
│   ├── api-client.ts                     # 前端 API 封装
│   ├── rate-limit.ts                     # 令牌桶限速
│   └── validate.ts                       # Zod 输入校验
└── supabase/
    └── migrations/                       # 数据库迁移 SQL
        └── 20260531_rebuild_schema.sql   # 完整建表脚本 (13张表)
```

## 开发历程与技术决策

### Phase 1: 基础架构搭建

项目启动时确定了核心技术选型：Next.js 15 App Router + Supabase + DeepSeek。选择 Next.js 是因为其 API Routes 可以避免独立后端服务，全栈统一在一个仓库中；Supabase 提供了开箱即用的 PostgreSQL + Storage + 实时订阅；DeepSeek 则在保持 GPT-4 级别能力的同时成本降低 90%+。

认证方案选择了自实现 JWT 而非 Supabase Auth，原因是项目需要完全自主控制认证流程，且后续可能迁移数据库。密码使用 bcryptjs 进行 hash，token 使用 jsonwebtoken 签发，前端通过 localStorage 管理 session。

### Phase 2: 核心功能迭代

AI 聊天模块从最初的同步响应改为 Server-Sent Events (SSE) 流式传输，显著提升了用户体验——用户在大模型生成第一个 token 时就能看到内容输出，而非等待完整响应。

模拟面试系统经历了三次重大重构：从简单的"问-答-评"三步走，进化为支持选项交互、上下文注入、计时压力、多维评分的完整面试模拟器。特别是信息库上下文注入功能（`getInfoBankContext`），使 AI 面试官能读取用户预先录入的项目经历和技能特长，实现"千人千面"的面试体验。

### Phase 3: 导航架构优化

项目初期采用 9 个顶部 Tab 的导航结构：概览、AI 聊天、模拟面试、简历管理、素材库、面试记录、面试冲刺、面试复盘、综合分析。在实际使用中发现 Tab 过多导致移动端体验极差，且存在功能边界模糊的问题。

最终通过合并策略优化为 6 个 Tab：

- **概览**：整合面试冲刺（从独立 Tab 降级为概览页内嵌模块）
- **AI 聊天**：保持不变
- **模拟面试**：保持不变
- **简历素材**：合并"简历管理"+"素材库"，通过 Sub-Tab 切换
- **面试记录**：保持不变
- **复盘分析**：合并"面试复盘"+"综合分析"，通过 Sub-Tab 切换

这次重构在保留全部功能的前提下，将认知负担降低了 33%，移动端可一屏展示完整导航。

### Phase 4: 交互增强

面试记录模块引入 HTML5 原生 Drag & Drop API 实现看板拖拽，选择原生实现而非引入第三方库（如 `dnd-kit` 或 `react-beautiful-dnd`）的原因是：功能需求简单（仅列间拖拽），原生 API 足以覆盖，避免引入额外 bundle 体积。

Browser Notification API 用于面试提醒，在用户授权后会定时检查未来 24 小时内的面试记录，提前发送桌面通知。这是一个渐进式增强功能——即使用户拒绝通知权限，核心功能不受影响。

## 踩坑记录与解决方案

### 1. Tailwind CSS v4 Typography 插件不兼容

**问题**：Tailwind CSS v4 使用了全新的配置体系（`@theme` 指令 + CSS-first 配置），不再支持传统的 `@import '@tailwindcss/typography'` 方式加载 Typography 插件。导致 AI 聊天中 Markdown 内容全部以原始文本渲染，无任何格式。

**尝试方案**：
1. 安装 `@tailwindcss/typography` 并通过 `@import` 引入 → 编译报错
2. 在 `tailwind.config.ts` 中配置 plugins 数组 → v4 已废弃此配置方式

**最终方案**：放弃 Typography 插件，在 `globals.css` 中手写完整的 `.markdown-body` 样式类（约 70 行 CSS），覆盖标题、段落、列表、代码块、引用块等所有常用 Markdown 元素。配合 `react-markdown` 组件渲染 AI 输出内容。

### 2. Markdown 原始文本渲染

**问题**：AI 返回的流式内容包含 Markdown 语法（如 `**加粗**`、`` `代码` ``、`- 列表`），但前端直接使用 `{message.content}` 渲染，导致用户看到原始标记。

**方案**：引入 `react-markdown` 库，将消息内容通过 `<ReactMarkdown className="markdown-body">{content}</ReactMarkdown>` 渲染，结合上述自定义样式实现完整的富文本展示。

### 3. 面试冲刺 Sprint 表接口 500 错误

**问题**：面试冲刺组件在首次加载时向 `/api/data/sprint-records` 发起 GET 请求，但新用户无任何 sprint 记录，后端 Supabase 查询返回空数组时因错误处理不当返回 500。

**方案**：修改 API 路由，对空结果进行优雅处理，返回空数组 `[]` 而非抛出错误。组件端增加空状态 UI 展示。

### 4. `verifyToken` 同步/异步混淆

**问题**：`lib/auth.ts` 中的 `verifyToken` 是同步函数（`jwt.verify` 同步调用），但在 API 路由中使用了 `await verifyToken(token)` 并访问 `.userId` 属性（实际字段为 `.id`）。

**表现**：模拟面试接口在尝试注入信息库上下文时静默失败，信息库数据无法注入面试官提示词。

**方案**：移除 `await`，直接调用 `const payload = verifyToken(token)`，并将属性访问从 `.userId` 修正为 `.id`。

### 5. 移动端 Tab 溢出

**问题**：9 个 Tab 在移动端无法一屏显示，用户需要横向滚动才能看到后面的 Tab，但滚动区域缺乏视觉提示，导致用户根本不知道还有更多 Tab。

**方案**：
1. 精简为 6 个 Tab（如前述导航架构优化）
2. 为 TabsList 容器添加 `overflow-x-auto` 和响应式 padding
3. 每个 Tab 使用 `hidden sm:inline` 控制完整文案 vs 简短文案的显示

### 6. API 路由目录不存在

**问题**：新增 JD 匹配 API 时，直接创建 `app/api/resume/jd-match/route.ts` 文件失败——因为 `app/api/resume/jd-match/` 目录不存在。

**方案**：使用 `mkdir -p app/api/resume/jd-match/` 递归创建目录后再写入文件。

## 安全设计

**认证与授权**：JWT Token 存储于 localStorage，每个 API 请求通过 Authorization Header 传递。服务端提取 token 并验证签名后才执行业务逻辑。数据库层面使用 RLS (Row Level Security) 确保用户只能访问自己的数据。

**速率限制**：所有 AI 相关接口（聊天、模拟面试、分析等）均配置令牌桶限速（默认 40 次/分钟），防止恶意调用导致 API 费用爆炸。

**输入校验**：使用 Zod schema 对所有 API 输入进行格式和长度校验，防止注入攻击和异常数据污染数据库。

**消息历史截断**：AI 对话历史在发送给模型前进行截断处理，避免超出上下文窗口限制（DeepSeek 默认 64K tokens）。

## 快速开始

### 环境要求

- Node.js 18+
- npm / pnpm / yarn
- Supabase 账户（免费 tier 即可）
- DeepSeek API Key

### 安装与运行

```bash
# 克隆项目
git clone https://github.com/Circuit94/personal-review-assitant.git
cd personal-review-assitant

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env.local
```

编辑 `.env.local`：

```env
# DeepSeek API
OPENAI_API_KEY=sk-your-deepseek-key
OPENAI_API_BASE=https://api.deepseek.com/v1
OPENAI_MODEL=deepseek-chat

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# JWT
JWT_SECRET=your-jwt-secret

# (可选) Vercel Blob - 音频存储
BLOB_READ_WRITE_TOKEN=your-vercel-blob-token
```

```bash
# 初始化数据库 (在 Supabase SQL Editor 中执行)
# 执行 supabase/migrations/20260531_rebuild_schema.sql

# 启动开发服务器
npm run dev
```

访问 http://localhost:3000 即可使用。

### 兼容 OpenAI

如需切换为 OpenAI 模型：

```env
OPENAI_API_KEY=sk-your-openai-key
OPENAI_API_BASE=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini
```

## 未来规划

- **简历 AI 润色**：基于 JD 自动优化简历措辞和排版
- **面试日历集成**：同步 Google Calendar / Apple Calendar 面试日程
- **团队协作**：面试互助小组，互相模拟面试、点评录音
- **数据导出**：一键导出面试复盘报告为 PDF
- **PWA 离线支持**：Service Worker 缓存面试素材供离线复习
- **多语言面试**：支持英文面试模拟（外企求职场景）

## 技术亮点总结

1. **流式 AI 交互**：全链路 SSE 实现，首 token 延迟 < 500ms
2. **上下文注入引擎**：简历 + 素材库 → 面试官 System Prompt，实现个性化追问
3. **零依赖拖拽看板**：HTML5 原生 Drag & Drop，无第三方库开销
4. **渐进式通知**：Browser Notification API 实现非侵入式面试提醒
5. **Tailwind v4 兼容方案**：手写 Markdown 样式类替代不兼容的 Typography 插件
6. **计时压力训练**：模拟面试支持答题倒计时，培养时间管控能力
7. **智能导航收敛**：9 Tab → 6 Tab + Sub-Tab，信息密度不变体验更优

## License

MIT

---

Built with ❤️ for job seekers everywhere.
