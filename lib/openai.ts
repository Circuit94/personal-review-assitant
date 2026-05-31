import OpenAI from 'openai'

// 统一的 OpenAI/DeepSeek 客户端配置
// 支持通过环境变量切换到 DeepSeek 或其他兼容 API
// 使用延迟初始化避免构建时因缺少环境变量而报错
let _openai: OpenAI | null = null
export function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || 'dummy-key-for-build',
      baseURL: process.env.OPENAI_API_BASE || 'https://api.deepseek.com/v1',
    })
  }
  return _openai
}

// 保持向后兼容的导出（延迟求值）
export const openai = new Proxy({} as OpenAI, {
  get(_, prop) {
    return (getOpenAI() as any)[prop]
  },
})

export const MODEL = process.env.OPENAI_MODEL || 'deepseek-chat'

// Whisper 模型单独配置（DeepSeek 不支持语音转写，可配置独立的 OpenAI key）
let _whisperClient: OpenAI | null = null
export function getWhisperClient(): OpenAI {
  if (!_whisperClient) {
    _whisperClient = new OpenAI({
      apiKey: process.env.WHISPER_API_KEY || process.env.OPENAI_API_KEY || 'dummy-key-for-build',
      baseURL: process.env.WHISPER_API_BASE || 'https://api.openai.com/v1',
    })
  }
  return _whisperClient
}

export const whisperClient = new Proxy({} as OpenAI, {
  get(_, prop) {
    return (getWhisperClient() as any)[prop]
  },
})
