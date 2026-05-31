import OpenAI from 'openai'

// DeepSeek 客户端配置
// 使用 openai SDK 兼容接口连接 DeepSeek API
// 'sk-placeholder' 避免构建时因缺少环境变量而抛出校验错误
export const openai = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY || 'sk-placeholder',
  baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
})

export const MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat'

// Whisper 语音转写客户端（DeepSeek 不支持语音，使用 OpenAI Whisper）
export const whisperClient = new OpenAI({
  apiKey: process.env.WHISPER_API_KEY || process.env.DEEPSEEK_API_KEY || 'sk-placeholder',
  baseURL: process.env.WHISPER_BASE_URL || 'https://api.openai.com/v1',
})
