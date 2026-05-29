import { NextResponse } from 'next/server'
import { openai, MODEL, whisperClient } from '@/lib/openai'
import { supabaseAdmin } from '@/lib/supabase/server'

export const maxDuration = 300 // 允许最长 5 分钟执行（Vercel Pro）

export async function POST(req: Request) {
  // 在 try 块外先解析 body，避免二次消费问题
  let recordId: string | undefined
  let userId: string | undefined

  try {
    const body = await req.json()
    recordId = body.recordId
    userId = body.userId

    if (!recordId) {
      return NextResponse.json({ error: 'Missing recordId' }, { status: 400 })
    }

    // 1. Update status to 'transcribing'
    await supabaseAdmin
      .from('interview_audio_records')
      .update({ status: 'transcribing' })
      .eq('id', recordId)

    // 2. Fetch record for file URL
    const { data: record, error: fetchError } = await supabaseAdmin
      .from('interview_audio_records')
      .select('*')
      .eq('id', recordId)
      .single()

    if (fetchError || !record) throw fetchError || new Error('Record not found')

    // 3. Transcribe using Whisper
    const audioRes = await fetch(record.file_url)
    if (!audioRes.ok) throw new Error('Failed to download audio file')

    const audioBlob = await audioRes.blob()
    const audioFile = new File([audioBlob], `audio.${record.file_format}`, { type: audioBlob.type })

    const transcription = await whisperClient.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      response_format: 'verbose_json',
      timestamp_granularities: ['segment'],
      language: 'zh',
    })

    const rawText = transcription.text

    // 4. Update status to 'analyzing'
    await supabaseAdmin
      .from('interview_audio_records')
      .update({
        status: 'analyzing',
        transcription: rawText,
      })
      .eq('id', recordId)

    // 5. Use AI to separate Q&A and analyze metrics
    const analysisPrompt = `
你是一位资深的面试分析专家。请根据以下面试录音的转写文本进行多维度分析。

要求：
1. 将文本拆分为"面试官(interviewer)"和"候选人(candidate)"的对话片段。
2. 提取核心指标：
   - 总体回答时长（秒）。
   - 问题类型分类（technical/behavioral/situational/other）。
   - 回答完整性评分（0-100）。
   - 关键词提取（最多 8 个）。
   - 情感倾向分析（正面/中性/负面）。
3. 多维度能力评分（每项 0-100）：
   - 表达清晰度
   - 逻辑性
   - 技术深度
   - 自信度
   - STAR法则运用
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

    // 6. Final Update to Database
    await supabaseAdmin
      .from('interview_audio_records')
      .update({
        status: 'completed',
        qa_segments: analysisContent.qa_segments,
        analysis: analysisContent.analysis,
        updated_at: new Date().toISOString(),
      })
      .eq('id', recordId)

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Processing error:', errorMessage)

    // 使用闭包中已解析的 recordId，避免二次消费 req.body
    if (recordId) {
      await supabaseAdmin
        .from('interview_audio_records')
        .update({
          status: 'failed',
          analysis: { error: errorMessage },
        })
        .eq('id', recordId)
    }

    return NextResponse.json({ error: 'Processing failed', details: errorMessage }, { status: 500 })
  }
}
