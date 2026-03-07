# 部署指南

本文档提供了将面试助手应用部署到 Vercel 的详细步骤。

## 前置要求

1. GitHub 账户
2. Vercel 账户
3. Supabase 账户
4. OpenAI API 密钥（或使用 Vercel AI Gateway）

## 步骤 1：准备 Supabase 项目

### 1.1 创建 Supabase 项目

1. 访问 [supabase.com](https://supabase.com)
2. 登录或创建账户
3. 点击 "New Project"
4. 填写项目信息：
   - 项目名称：例如 "interview-assistant"
   - 数据库密码：设置一个强密码
   - 选择区域（选择离你最近的）

### 1.2 获取凭证

项目创建完成后，在项目设置中找到：
- 项目 URL（`NEXT_PUBLIC_SUPABASE_URL`）
- Anon Key（`NEXT_PUBLIC_SUPABASE_ANON_KEY`）

### 1.3 创建数据库表

在 Supabase 仪表板中：
1. 进入 "SQL Editor"
2. 复制 `scripts/001_create_tables.sql` 的内容
3. 执行 SQL 脚本

## 步骤 2：获取 OpenAI 凭证

### 选项 A：使用 Vercel AI Gateway（推荐）

Vercel AI Gateway 已内置支持 OpenAI。在 Vercel 项目设置中配置即可，无需额外的 API 密钥。

### 选项 B：直接使用 OpenAI API

1. 访问 [openai.com](https://platform.openai.com)
2. 创建 API 密钥
3. 复制密钥供稍后使用

## 步骤 3：配置 Vercel Blob 存储

Vercel Blob 存储在部署到 Vercel 时会自动配置。确保在 Vercel 项目设置中启用 Blob 存储。

## 步骤 4：准备 GitHub 仓库

### 4.1 推送代码到 GitHub

```bash
git add .
git commit -m "Initial commit: Interview Assistant app"
git push origin main
```

### 4.2 确保以下文件已提交

- 所有应用文件
- `.gitignore`（不包含 `.env.local`）
- `README.md` 和部署指南

## 步骤 5：在 Vercel 上部署

### 5.1 连接 GitHub 仓库

1. 访问 [vercel.com](https://vercel.com)
2. 登录你的 Vercel 账户
3. 点击 "New Project"
4. 选择你的 GitHub 仓库
5. 点击 "Import"

### 5.2 配置环境变量

在 Vercel 项目设置中，进入 "Environment Variables"，添加：

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
OPENAI_API_KEY=your_openai_key  # 如果使用 Vercel AI Gateway 可选
```

### 5.3 部署

1. 检查构建设置（默认应该是正确的）
2. 点击 "Deploy"
3. 等待构建完成

## 步骤 6：验证部署

1. 部署完成后，访问你的应用 URL
2. 测试注册、登录功能
3. 上传简历测试
4. 测试 AI 聊天功能

## 常见问题解决

### 数据库连接失败

**问题：** `Error: connect ECONNREFUSED 127.0.0.1:5432`

**解决：**
1. 检查 Supabase URL 是否正确
2. 确保在 Supabase 中创建了数据库表
3. 验证 API Key 是否有效

### Blob 存储报错

**问题：** `Error: BLOB_READ_WRITE_TOKEN not found`

**解决：**
1. 确保在 Vercel 项目中启用了 Blob 存储
2. 检查环境变量中是否自动添加了 token
3. 尝试重新部署

### OpenAI API 错误

**问题：** `Error: 401 Unauthorized`

**解决：**
1. 检查 API 密钥是否正确
2. 确保账户有足够的额度
3. 检查是否使用了已弃用的模型

## 后续维护

### 定期备份

定期备份 Supabase 数据库：
1. 在 Supabase 仪表板中，进入 "Backups"
2. 下载备份文件

### 监控性能

在 Vercel 仪表板中：
1. 检查构建日志
2. 监控 API 使用情况
3. 查看错误日志

### 更新依赖

定期更新依赖包：
```bash
npm update
npm audit fix
```

## 扩展和优化

### 添加更多 AI 功能

1. 在 `app/api/` 中创建新的 API 路由
2. 使用 AI SDK v6 实现功能
3. 更新组件以调用新的 API

### 性能优化

1. 启用 React Compiler（已配置）
2. 使用 Next.js 13+ 的 Image 优化
3. 实现缓存策略

### 增强安全性

1. 定期更新依赖
2. 实施更严格的 RLS 策略
3. 添加速率限制

## 监控和日志

### Vercel Analytics

应用已集成 Vercel Analytics，自动追踪：
- 页面加载时间
- 用户交互
- 错误率

### 查看日志

在 Vercel 仪表板中：
1. 进入 "Deployments"
2. 选择特定部署
3. 查看构建日志和运行时日志

## 支持和反馈

有任何问题？
- 检查 [Vercel 文档](https://vercel.com/docs)
- 查看 [Supabase 文档](https://supabase.com/docs)
- 查看 [AI SDK 文档](https://sdk.vercel.ai)

---

祝你的应用部署顺利！
