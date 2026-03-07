# 快速入门指南 (5 分钟)

欢迎使用面试助手应用！这个指南会帮助你快速开始。

## 1. 检查环境 (1 分钟)

```bash
# 验证所有配置
npm run verify
```

如果所有检查都通过，继续下一步。如果有错误，参考 `TROUBLESHOOTING.md`。

## 2. 本地开发 (1 分钟)

```bash
# 安装依赖（如果还没安装）
npm install

# 启动开发服务器
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)

## 3. 注册和登录 (1 分钟)

1. 点击"注册"
2. 输入邮箱和密码
3. 验证邮箱（开发环境可跳过）
4. 登录进入仪表板

## 4. 尝试功能 (2 分钟)

### 上传简历
1. 点击"简历管理"标签
2. 上传一个 PDF 文件
3. 看到简历出现在列表中

### AI 聊天
1. 点击"AI 聊天"标签
2. 输入问题：「我想准备前端工程师面试，有什么建议？」
3. 等待 AI 回复

### 模拟面试
1. 点击"模拟面试"标签
2. 输入「前端工程师」
3. 点击"生成 5 道面试题目"
4. 逐题回答

### 面试记录
1. 点击"面试记录"标签
2. 点击"添加记录"
3. 填写公司、岗位和面试笔记
4. 点击"保存记录"

### 复盘分析
1. 点击"复盘分析"标签
2. 点击"周复盘"
3. 查看 AI 生成的分析报告

## 配置环境变量 (必需)

### 获取 Supabase 凭证

1. 访问 [supabase.com](https://supabase.com)
2. 创建新项目
3. 在项目设置中找到 URL 和 Anon Key
4. 复制到 `.env.local`：

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### 创建数据库表

1. 在 Supabase 仪表板中找到 SQL Editor
2. 复制 `scripts/001_create_tables.sql` 的内容
3. 粘贴并执行

## 部署到 Vercel (可选)

```bash
# 1. 推送到 GitHub
git add .
git commit -m "Initial commit"
git push origin main

# 2. 访问 vercel.com
# 3. 连接 GitHub 仓库
# 4. 添加环境变量
# 5. 点击 Deploy
```

详见 `DEPLOYMENT.md`

## 常见问题

### Q: 无法连接数据库
**A:** 检查 Supabase 凭证是否正确，确保运行了迁移脚本。

### Q: AI 聊天不工作
**A:** 检查 OpenAI API 或 Vercel AI Gateway 是否配置。

### Q: 简历上传失败
**A:** 确保文件是 PDF 格式，大小在 50MB 以下。

更多问题见 `TROUBLESHOOTING.md`

## 下一步

- 📚 阅读 `README.md` 了解完整功能
- 🚀 按照 `DEPLOYMENT.md` 部署应用
- 👨‍💻 查看 `DEVELOPMENT.md` 学习如何扩展功能
- ✨ 查看 `FEATURES.md` 了解详细功能说明

## 获取帮助

- 问题排查：见 `TROUBLESHOOTING.md`
- 开发指南：见 `DEVELOPMENT.md`
- 功能详解：见 `FEATURES.md`
- 部署问题：见 `DEPLOYMENT.md`

---

祝你面试准备顺利！如有问题，随时查看文档。
