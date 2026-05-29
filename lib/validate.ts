// 输入校验工具

export function validateString(
  value: unknown,
  fieldName: string,
  options: { minLength?: number; maxLength?: number; required?: boolean } = {}
): string {
  const { minLength = 0, maxLength = 10000, required = true } = options

  if (value === undefined || value === null || value === '') {
    if (required) throw new Error(`${fieldName} 不能为空`)
    return ''
  }

  if (typeof value !== 'string') {
    throw new Error(`${fieldName} 必须是字符串`)
  }

  const trimmed = value.trim()

  if (required && trimmed.length === 0) {
    throw new Error(`${fieldName} 不能为空`)
  }

  if (trimmed.length < minLength) {
    throw new Error(`${fieldName} 至少需要 ${minLength} 个字符`)
  }

  if (trimmed.length > maxLength) {
    throw new Error(`${fieldName} 不能超过 ${maxLength} 个字符`)
  }

  return trimmed
}

type ChatRole = 'user' | 'assistant' | 'system'

export function validateMessages(messages: unknown): Array<{ role: ChatRole; content: string }> {
  if (!Array.isArray(messages)) {
    throw new Error('messages 必须是数组')
  }

  if (messages.length === 0) {
    throw new Error('messages 不能为空')
  }

  if (messages.length > 50) {
    throw new Error('消息历史过长，请开始新对话')
  }

  return messages.map((msg, idx) => {
    if (!msg || typeof msg !== 'object') {
      throw new Error(`消息 ${idx} 格式无效`)
    }
    const role = validateString(msg.role, `消息 ${idx} 的 role`)
    if (!['user', 'assistant', 'system'].includes(role)) {
      throw new Error(`消息 ${idx} 的 role 无效`)
    }
    const content = validateString(msg.content, `消息 ${idx} 的 content`, { maxLength: 8000 })
    return { role: role as ChatRole, content }
  })
}
