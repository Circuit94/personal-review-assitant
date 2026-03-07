#!/usr/bin/env node

/**
 * 配置验证脚本
 * 检查所有必需的环境变量和依赖是否已正确配置
 */

const fs = require('fs')
const path = require('path')

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function checkFile(filePath, description) {
  const exists = fs.existsSync(filePath)
  if (exists) {
    log(`✓ ${description}`, 'green')
    return true
  } else {
    log(`✗ ${description} - 文件不存在: ${filePath}`, 'red')
    return false
  }
}

function checkEnvVar(varName, required = true) {
  const value = process.env[varName]
  if (value) {
    log(`✓ ${varName} 已设置`, 'green')
    return true
  } else if (required) {
    log(`✗ ${varName} 未设置 (必需)`, 'red')
    return false
  } else {
    log(`⚠ ${varName} 未设置 (可选)`, 'yellow')
    return true
  }
}

function main() {
  log('\n=== 面试助手应用 - 配置验证 ===\n', 'blue')

  let allPassed = true

  // 检查 Node.js 版本
  log('检查 Node.js 版本...', 'blue')
  const nodeVersion = process.version
  const majorVersion = parseInt(nodeVersion.split('.')[0].slice(1))
  if (majorVersion >= 18) {
    log(`✓ Node.js ${nodeVersion} (需要 >= 18)`, 'green')
  } else {
    log(`✗ Node.js ${nodeVersion} (需要 >= 18)`, 'red')
    allPassed = false
  }

  // 检查关键文件
  log('\n检查关键文件...', 'blue')
  allPassed &= checkFile('package.json', 'package.json')
  allPassed &= checkFile('app/layout.tsx', 'App 布局文件')
  allPassed &= checkFile('middleware.ts', '中间件文件')
  allPassed &= checkFile('scripts/001_create_tables.sql', '数据库迁移脚本')

  // 检查必需的依赖
  log('\n检查依赖安装...', 'blue')
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')
  )
  const requiredDeps = [
    'next',
    'react',
    'react-dom',
    '@supabase/supabase-js',
    '@supabase/ssr',
    '@vercel/blob',
    'ai',
    '@ai-sdk/openai',
    '@ai-sdk/react',
  ]

  const allDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  }

  for (const dep of requiredDeps) {
    if (allDeps[dep]) {
      log(`✓ ${dep} 已安装`, 'green')
    } else {
      log(`✗ ${dep} 未安装`, 'red')
      allPassed = false
    }
  }

  // 检查环境变量
  log('\n检查环境变量...', 'blue')
  const envPath = path.join(process.cwd(), '.env.local')
  if (!fs.existsSync(envPath)) {
    log('⚠ .env.local 不存在，请复制 .env.example 并填入凭证', 'yellow')
  } else {
    log('✓ .env.local 文件存在', 'green')

    const envContent = fs.readFileSync(envPath, 'utf8')
    const requiredVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    ]

    for (const varName of requiredVars) {
      const hasVar =
        envContent.includes(varName) &&
        !envContent.includes(`${varName}=`) &&
        !envContent.includes(`#${varName}`)
      if (hasVar || process.env[varName]) {
        log(`✓ ${varName} 已配置`, 'green')
      } else {
        log(`✗ ${varName} 未配置`, 'red')
        allPassed = false
      }
    }
  }

  // 检查组件文件
  log('\n检查主要组件...', 'blue')
  const components = [
    'components/resume-upload.tsx',
    'components/interview-notes.tsx',
    'components/ai-chat.tsx',
    'components/mock-interview.tsx',
    'components/interview-review.tsx',
  ]

  for (const component of components) {
    allPassed &= checkFile(component, `组件: ${component}`)
  }

  // 检查 API 路由
  log('\n检查 API 路由...', 'blue')
  const apiRoutes = [
    'app/api/chat/route.ts',
    'app/api/generate-interview-questions/route.ts',
    'app/api/generate-review/route.ts',
    'app/api/resume/route.ts',
  ]

  for (const route of apiRoutes) {
    allPassed &= checkFile(route, `API: ${route}`)
  }

  // 最终报告
  log('\n=== 验证结果 ===\n', 'blue')
  if (allPassed) {
    log('✓ 所有检查已通过！你可以开始开发了。', 'green')
    log('\n后续步骤：', 'blue')
    log('1. 运行: npm run dev')
    log('2. 打开: http://localhost:3000')
    log('3. 按照部署指南进行部署')
    process.exit(0)
  } else {
    log('✗ 存在一些配置问题，请修复后重试。', 'red')
    log('\n常见问题排查：', 'yellow')
    log('1. 如果缺少依赖，运行: npm install')
    log('2. 如果缺少 .env.local，复制 .env.example 并填入凭证')
    log('3. 确保 Node.js 版本 >= 18')
    process.exit(1)
  }
}

main()
