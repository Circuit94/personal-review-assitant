import { NextResponse } from 'next/server'
import { openai, MODEL } from '@/lib/openai'
import { getUserFromRequest } from '@/lib/auth'
import supabaseAdmin from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

export const maxDuration = 300

export async function POST(req: Request) {
  let recordId: string | undefined

  try {
    const user = getUserFromRequest(req)
    if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

    const body = await req.json()
    const { text, title } = body
    recordId = body.recordId

    // 如果传入了 recordId，说明是对已有记录重新分析
    // 否则，先创建一条新记录再分析
    if (!recordId) {
      if (!text || !text.trim()) {
        return NextResponse.json({ error: '请输入面试文本内容' }, { status: 400 })
      }

      const id = uuidv4()
      const { error: insertError } = await supabaseAdmin
        .from('interview_audio_records')
        .insert({
          id,
          user_id: user.id,
          title: title || `面试记录 ${new Date().toLocaleDateString()}`,
          file_url: '',
          file_format: 'text',
          file_size: new TextEncoder().encode(text).length,
          status: 'analyzing',
          transcription: text,
        })

      if (insertError) throw new Error(insertError.message)
      recordId = id
    } else {
      // 更新现有记录状态为 analyzing
      await supabaseAdmin
        .from('interview_audio_records')
        .update({ status: 'analyzing', updated_at: new Date().toISOString() })
        .eq('id', recordId)
        .eq('user_id', user.id)
    }

    // 获取文本内容（优先使用传入的 text，否则从数据库取）
    let rawText = text
    if (!rawText) {
      const { data: record } = await supabaseAdmin
        .from('interview_audio_records')
        .select('transcription')
        .eq('id', recordId)
        .eq('user_id', user.id)
        .single()

      if (!record?.transcription) throw new Error('无可分析文本')
      rawText = record.transcription
    }

    // AI 分析
    const analysisPrompt = `你是一位资深的面试分析专家。请根据以下面试对话文本进行多维度分析。

要求：
1. 将文本拆分为"面试官(interviewer)"和"候选人(candidate)"的对话片段。如果文本没有明确标记角色，请根据上下文语义合理推断。
2. 提取核心指标：问题类型分类、回答完整性评分（0-100）、关键词提取（最多8个）、情感倾向分析。
3. 多维度能力评分（每项 0-100）：表达清晰度、逻辑性、技术深度、自信度、STAR法则运用。
4. 给候选人提供具体的改进建议（3-5 条）。

面试文本：
${rawText.slice(0, 8000)}

请以 JSON 格式返回结果，结构如下：
{
  "qa_segments": [
    { "role": "interviewer", "content": "..." },
    { "role": "candidate", "content": "..." }
  ],
  "analysis": {
    "type": "technical",
    "score": 85,
    "keywords": ["React", "Hooks"],
    "sentiment": "正面",
    "summary": "...",
    "suggestions": ["建议1", "建议2", "建议3"],
    "dimensions": [
      { "subject": "表达清晰度", "score": 80, "fullMark": 100 },
      { "subject": "逻辑性", "score": 90, "fullMark": 100 },
      { "subject": "技术深度", "score": 70, "fullMark": 100 },
      { "subject": "自信度", "score": 85, "fullMark": 100 },
      { "subject": "STAR法则", "score": 65, "fullMark": 100 }
    ]
  }
}`

    const analysisRes = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: '你是一位资深的面试分析专家，请严格按照要求的 JSON 格式输出。' },
        { role: 'user', content: analysisPrompt },
      ],
      response_format: { type: 'json_object' },
    })

    const analysisContent = JSON.parse(analysisRes.choices[0].message.content || '{}')

    // 更新记录
    await supabaseAdmin
      .from('interview_audio_records')
      .update({
        status: 'completed',
        transcription: rawText,
        qa_segments: analysisContent.qa_segments,
        analysis: analysisContent.analysis,
        updated_at: new Date().toISOString(),
      })
      .eq('id', recordId)

    return NextResponse.json({ success: true, recordId })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Processing error:', errorMessage)

    if (recordId) {
      await supabaseAdmin
        .from('interview_audio_records')
        .update({
          status: 'failed',
          analysis: { error: errorMessage },
          updated_at: new Date().toISOString(),
        })
        .eq('id', recordId)
    }

    return NextResponse.json({ error: 'Processing failed', details: errorMessage }, { status: 500 })
  }
}
