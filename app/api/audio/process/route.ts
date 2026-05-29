import { NextResponse } from 'next/server'
import { openai, MODEL, whisperClient } from '@/lib/openai'
import { getUserFromRequest } from '@/lib/auth'
import db from '@/lib/db'

export const maxDuration = 300

export async function POST(req: Request) {
  let recordId: string | undefined

  try {
    const user = getUserFromRequest(req)
    if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

    const body = await req.json()
    recordId = body.recordId

    if (!recordId) {
      return NextResponse.json({ error: 'Missing recordId' }, { status: 400 })
    }

    // 1. Update status to 'transcribing'
    db.prepare("UPDATE interview_audio_records SET status = 'transcribing', updated_at = datetime('now') WHERE id = ? AND user_id = ?").run(recordId, user.id)

    // 2. Fetch record
    const record = db.prepare('SELECT * FROM interview_audio_records WHERE id = ? AND user_id = ?').get(recordId, user.id) as {
      id: string; file_url: string; file_name: string
    } | undefined

    if (!record) throw new Error('Record not found')

    // 3. Transcribe using Whisper
    const audioRes = await fetch(record.file_url.startsWith('/') ? `http://localhost:${process.env.PORT || 3000}${record.file_url}` : record.file_url)
    if (!audioRes.ok) throw new Error('Failed to download audio file')

    const audioBlob = await audioRes.blob()
    const ext = record.file_name.split('.').pop() || 'mp3'
    const audioFile = new File([audioBlob], `audio.${ext}`, { type: audioBlob.type })

    const transcription = await whisperClient.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      response_format: 'verbose_json',
      timestamp_granularities: ['segment'],
      language: 'zh',
    })

    const rawText = transcription.text

    // 4. Update status to 'analyzing'
    db.prepare("UPDATE interview_audio_records SET status = 'analyzing', transcription = ?, updated_at = datetime('now') WHERE id = ?").run(rawText, recordId)

    // 5. AI analysis
    const analysisPrompt = `
你是一位资深的面试分析专家。请根据以下面试录音的转写文本进行多维度分析。

要求：
1. 将文本拆分为"面试官(interviewer)"和"候选人(candidate)"的对话片段。
2. 提取核心指标：总体回答时长、问题类型分类、回答完整性评分（0-100）、关键词提取（最多8个）、情感倾向分析。
3. 多维度能力评分（每项 0-100）：表达清晰度、逻辑性、技术深度、自信度、STAR法则运用。
4. 给候选人提供具体的改进建议（3-5 条）。

转写文本：
${rawText.slice(0, 6000)}

请以 JSON 格式返回结果，结构如下：
{
  "qa_segments": [
    { "role": "interviewer", "content": "...", "start_time": 0, "end_time": 0 },
    { "role": "candidate", "content": "...", "start_time": 0, "end_time": 0 }
  ],
  "analysis": {
    "duration": 0,
    "type": "technical",
    "score": 85,
    "keywords": ["React", "Hooks", "性能优化"],
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

    // 6. Final update
    db.prepare(
      "UPDATE interview_audio_records SET status = 'completed', qa_segments = ?, analysis = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(JSON.stringify(analysisContent.qa_segments), JSON.stringify(analysisContent.analysis), recordId)

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Processing error:', errorMessage)

    if (recordId) {
      db.prepare(
        "UPDATE interview_audio_records SET status = 'failed', analysis = ?, updated_at = datetime('now') WHERE id = ?"
      ).run(JSON.stringify({ error: errorMessage }), recordId)
    }

    return NextResponse.json({ error: 'Processing failed', details: errorMessage }, { status: 500 })
  }
}
