# 开发日志与技术深潜

> 本文档记录了面试助手从 0 到 1 的完整开发历程，包括每个功能模块的设计决策、实现细节、踩坑记录和优化过程。

## 一、项目背景与动机

面试准备是一个典型的"长周期、多维度"任务。求职者往往需要同时管理多份简历版本、追踪数十家公司的面试进度、反复练习不同类型的面试题、复盘每次真实面试的表现。市面上的工具要么是纯刷题平台（如 LeetCode），要么是通用 AI 聊天（如 ChatGPT），缺乏一个将"备战全链路"整合在一起的专项工具。

本项目的目标是：打造一个 AI 原生的面试备战工作台，让求职者在一个工具内完成从投递到拿 Offer 的全部准备，同时通过数据积累实现越用越懂用户的个性化体验。

## 二、技术选型详解

### Next.js 15 App Router

选择 App Router 而非 Pages Router 的核心原因：

1. **API Routes 与前端同仓**：对于个人项目，全栈统一在一个仓库中极大降低了维护成本。API Routes 部署为 Vercel Serverless Functions，冷启动时间约 200ms。
2. **React Server Components**：虽然当前项目以客户端交互为主（`'use client'`），但 App Router 为后续优化提供了渐进式采用 RSC 的空间。
3. **内置路由分组**：`app/api/data/*` 的嵌套路由结构天然对应 CRUD 操作，代码组织清晰。

### Supabase 而非 Firebase

1. **PostgreSQL 原生**：支持复杂查询（JOIN、聚合、窗口函数），为后续数据分析提供灵活性。
2. **RLS 原生支持**：数据库层面的行级安全，即使 API 代码有漏洞也能兜底。
3. **开源自托管**：理论上可以脱离 Supabase 云，使用 Docker 自建。
4. **成本透明**：免费 tier 包含 500MB 数据库 + 1GB 存储，个人项目完全够用。

### DeepSeek API

1. **OpenAI 兼容接口**：直接使用 `openai` 官方 SDK，仅需修改 `baseURL` 和 `model` 参数。
2. **成本优势**：DeepSeek Chat 定价约为 GPT-4o-mini 的 1/10，适合高频调用场景（模拟面试每次 10-20 轮对话）。
3. **中文能力**：面试助手以中文面试为主场景，DeepSeek 的中文理解和生成能力表现优异。

### Tailwind CSS v4

项目启动时 Tailwind v4 刚发布不久，选择尝鲜的原因是其革命性的 CSS-first 配置和更小的 bundle 体积。但也因此踩了 Typography 插件不兼容的坑（详见踩坑章节）。

## 三、核心模块实现细节

### 3.1 认证系统

```
用户注册: email + password → bcrypt hash → 写入 users 表 → 签发 JWT
用户登录: email + password → bcrypt compare → 签发 JWT
会话验证: localStorage 存储 token → api-client 自动注入 Authorization Header
```

Token Payload 结构：`{ id: string, email: string, iat: number, exp: number }`

选择自实现认证而非 Supabase Auth 的原因：Supabase Auth 的 token 刷新机制较为黑盒，且与自定义 JWT 校验逻辑（如在模拟面试 API 中可选认证）存在冲突。自实现方案虽然多写了些代码，但对 token 生命周期拥有完全控制权。

### 3.2 AI 流式对话

```typescript
// 核心实现模式 (SSE)
const response = await openai.chat.completions.create({
  model: MODEL,
  messages: apiMessages,
  stream: true,
  temperature: 0.8,
})

const stream = new ReadableStream({
  async start(controller) {
    for await (const chunk of response) {
      const content = chunk.choices[0]?.delta?.content || ''
      if (content) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`))
      }
    }
    controller.enqueue(encoder.encode('data: [DONE]\n\n'))
    controller.close()
  },
})
```

前端使用 `EventSource` 模式消费流：逐字追加到消息 state 中，实现打字机效果。为避免频繁 re-render，消息内容使用 `useRef` + 节流更新策略。

### 3.3 模拟面试上下文注入

这是产品的核心差异化功能，实现流程如下：

```
1. 用户发起模拟面试 → 前端发送 POST /api/mock-interview
2. API 从 Authorization Header 提取 userId
3. 调用 getInfoBankContext(userId):
   - 查询 info_fields 表 (label + value, 限20条)
   - 查询 info_modules 表 (模块名称)
   - 拼接为结构化文本: "[模块名] 字段标签: 字段值"
4. 将 infoBankContext 追加到 resumeText 字段
5. resumeText 注入 System Prompt: "候选人简历摘要：{resumeText}"
6. AI 面试官基于完整背景进行针对性提问
```

这种设计使得用户只需在素材库中维护一份信息，所有面试场景自动继承，避免了每次面试前重复输入背景信息。

### 3.4 看板拖拽实现

选择 HTML5 原生 Drag & Drop 的核心代码结构：

```typescript
// 状态管理
const [draggedRecord, setDraggedRecord] = useState<string | null>(null)
const [dragOverStage, setDragOverStage] = useState<string | null>(null)

// 卡片端
<div
  draggable
  onDragStart={(e) => {
    setDraggedRecord(record.id)
    e.dataTransfer.effectAllowed = 'move'
  }}
/>

// 列端 (Drop Zone)
<div
  onDragOver={(e) => { e.preventDefault(); setDragOverStage(stage) }}
  onDragLeave={() => setDragOverStage(null)}
  onDrop={() => handleDrop(stage)}
/>
```

Drop 时调用 API 更新记录的 `stage` 字段，乐观更新本地状态后异步同步数据库。

### 3.5 Browser Notification 面试提醒

```typescript
function checkUpcomingInterviews() {
  if (!('Notification' in window)) return
  if (Notification.permission !== 'granted') {
    Notification.requestPermission()
    return
  }
  
  const upcoming = records.filter(r => {
    const interviewDate = new Date(r.interview_date)
    const now = new Date()
    const diff = interviewDate.getTime() - now.getTime()
    return diff > 0 && diff < 24 * 60 * 60 * 1000 // 24小时内
  })
  
  upcoming.forEach(r => {
    new Notification('面试提醒', {
      body: `${r.company} - ${r.position}，面试时间：${r.interview_date}`,
      icon: '/favicon.ico'
    })
  })
}
```

### 3.6 计时压力模式

模拟面试中的倒计时逻辑：

```typescript
const [timerMode, setTimerMode] = useState(false)
const [answerTimeLimit, setAnswerTimeLimit] = useState(60)
const [answerTimer, setAnswerTimer] = useState(0)
const [isTimerWarning, setIsTimerWarning] = useState(false)

useEffect(() => {
  if (!timerMode || answerTimer <= 0) return
  const interval = setInterval(() => {
    setAnswerTimer(prev => {
      if (prev <= 1) { clearInterval(interval); return 0 }
      if (prev <= 10) setIsTimerWarning(true)
      return prev - 1
    })
  }, 1000)
  return () => clearInterval(interval)
}, [timerMode, answerTimer])
```

倒计时 ≤ 10 秒时触发 `isTimerWarning` 状态，UI 显示红色闪烁效果，模拟真实面试的时间压力感。

### 3.7 JD 匹配分析

```typescript
// API: /api/resume/jd-match
// 输入: resumeText + jdText
// 输出: { score, matchedKeywords, missingKeywords, suggestions }

const prompt = `分析以下简历与JD的匹配度...
输出严格JSON格式:
{
  "score": 0-100,
  "matchedKeywords": ["匹配的关键技能"],
  "missingKeywords": ["简历中缺失的JD要求"],
  "suggestions": ["具体优化建议"]
}`
```

该功能帮助用户在投递前快速评估简历与目标岗位的契合度，并获得针对性的修改建议。

## 四、性能优化实践

### 4.1 消息历史截断策略

AI 接口的 token 用量直接关联费用，因此需要对对话历史进行智能截断：

- 聊天模式：保留最近 20 条消息
- 模拟面试：保留全部对话（面试连贯性比节省 token 更重要）
- System Prompt 中的简历文本：截取前 2000 字符

### 4.2 组件按需加载

6 个 Tab 页使用 `<TabsContent>` 的懒渲染特性——非激活 Tab 的内容不会挂载到 DOM，减少初始渲染压力。

### 4.3 速率限制

使用内存级令牌桶算法，以 IP + 接口路径为 key：

```typescript
const { allowed, resetIn } = checkRateLimit(`mock:${ip}`, {
  maxRequests: 40,
  windowMs: 60000  // 每分钟40次
})
```

## 五、部署与运维

### Vercel 部署配置

- **Framework Preset**: Next.js
- **Build Command**: `next build`
- **Output Directory**: `.next`
- **环境变量**：通过 Vercel Dashboard 配置，不同环境（Preview / Production）可设置不同值
- **Region**: 建议选择亚洲节点（如 `hkg1`），降低访问 DeepSeek API 的延迟

### Supabase 配置要点

- 执行完 migration SQL 后，务必在 Dashboard 中为每张表开启 RLS
- 创建对应的 Policy 允许 service_role 完全访问（API Routes 使用 service_role_key）
- Storage Bucket 需手动创建并设置公开/私有访问策略

## 六、经验总结

1. **AI 产品的核心不是 AI 本身，而是上下文工程**。模拟面试之所以效果好，不是因为 DeepSeek 比 ChatGPT 强，而是因为系统能自动注入用户的简历、素材库、面试偏好等个性化上下文，让同一个模型产出截然不同的结果。

2. **Tailwind v4 尝鲜有代价**。新版本的生态兼容性需要时间完善，Typography 插件的缺失迫使手写了 70 行 CSS。建议生产项目在 v4 生态成熟前继续使用 v3。

3. **导航设计遵循 7±2 法则**。9 个 Tab 严重超出用户的瞬时记忆容量，精简为 6 个后用户测试反馈显著改善。"功能全"不等于"体验好"，适当的信息聚合比暴力罗列更有效。

4. **原生 API 优先于第三方库**。Drag & Drop、Notification、IntersectionObserver 等浏览器原生能力在简单场景下完全够用，避免为了一个功能引入整个库。

5. **乐观更新 + 异步同步**是最佳交互模式。看板拖拽后立即更新本地状态给用户即时反馈，同时异步调用 API 持久化。失败时回滚并提示用户。

6. **自实现认证的利弊**。好处是完全控制认证流程，坏处是需要自己处理 token 过期、刷新等边界情况。对于个人项目，收益大于成本；团队项目建议使用成熟方案。

## 七、已知限制

- 音频转写依赖 Whisper API，超长录音（>25MB）需要分片处理
- 面试记录看板不支持跨列批量拖拽
- 综合分析报告需要至少 3 条面试记录才能生成有意义的趋势
- 移动端体验为响应式适配，非原生 App 体验

## 八、致谢

- [Next.js](https://nextjs.org/) - 全栈 React 框架
- [Supabase](https://supabase.com/) - 开源 Firebase 替代
- [DeepSeek](https://deepseek.com/) - 高性价比大语言模型
- [shadcn/ui](https://ui.shadcn.com/) - 可复制粘贴的 UI 组件库
- [Tailwind CSS](https://tailwindcss.com/) - 原子化 CSS 框架
- [Vercel](https://vercel.com/) - 零配置部署平台
