import OpenAI from 'openai'

// 统一的 OpenAI/DeepSeek 客户端配置
// 支持通过环境变量切换到 DeepSeek 或其他兼容 API
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_API_BASE || 'https://api.deepseek.com/v1',
})

export const MODEL = process.env.OPENAI_MODEL || 'deepseek-chat'

// Whisper 模型单独配置（DeepSeek 不支持语音转写，可配置独立的 OpenAI key）
export const whisperClient = new OpenAI({
  apiKey: process.env.WHISPER_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: process.env.WHISPER_API_BASE || 'https://api.openai.com/v1',
})
