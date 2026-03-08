import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { supabase } from '@/lib/supabase/client'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_API_BASE || 'https://api.openai.com/v1',
})

export async function POST(req: Request) {
  try {
    const { recordId, userId } = await req.json()

    if (!recordId) {
      return NextResponse.json({ error: 'Missing recordId' }, { status: 400 })
    }

    // 1. Update status to 'transcribing'
    await supabase.from('interview_audio_records').update({ status: 'transcribing' }).eq('id', recordId)

    // 2. Fetch record for file URL
    const { data: record, error: fetchError } = await supabase
      .from('interview_audio_records')
      .select('*')
      .eq('id', recordId)
      .single()

    if (fetchError || !record) throw fetchError || new Error('Record not found')

    // 3. Transcribe using Whisper
    // Note: Whisper requires a File object or buffer. Vercel Blob URLs can be fetched.
    const audioRes = await fetch(record.file_url)
    const audioBlob = await audioRes.blob()
    const audioFile = new File([audioBlob], `audio.${record.file_format}`, { type: audioBlob.type })

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      response_format: 'verbose_json',
      timestamp_granularities: ['segment'],
      language: 'zh'
    })

    const rawText = transcription.text
    
    // 4. Update status to 'analyzing'
    await supabase.from('interview_audio_records').update({ 
      status: 'analyzing',
      transcription: rawText 
    }).eq('id', recordId)

    // 5. Use GPT-4 to separate Q&A and analyze metrics
    const analysisPrompt = `
      你是一位资深的面试分析专家。请根据以下面试录音的转写文本进行多维度分析。
      
      要求：
      1. 将文本拆分为"面试官(interviewer)"和"候选人(candidate)"的对话片段。
      2. 提取核心指标：
         - 总体回答时长。
         - 问题类型分类（技术/行为/情景/其他）。
         - 回答完整性评分（0-100）。
         - 关键词提取。
         - 情感倾向分析（正面/中性/负面）。
      3. 给候选人提供具体的改进建议。

      转写文本：
      ${rawText}

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
          "summary": "候选人对 React 的核心概念有深刻理解，但在并发模式的回答上略显简略。",
          "suggestions": ["在回答 Hooks 时可以结合实际项目中的 Bug 修复案例", "建议多练习 STAR 法则来组织行为面试题的答案"]
        }
      }
    `

    const analysisRes = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: '你是一位资深的面试分析专家。' },
        { role: 'user', content: analysisPrompt }
      ],
      response_format: { type: 'json_object' }
    })

    const analysisContent = JSON.parse(analysisRes.choices[0].message.content || '{}')

    // 6. Final Update to Database
    await supabase.from('interview_audio_records').update({
      status: 'completed',
      qa_segments: analysisContent.qa_segments,
      analysis: analysisContent.analysis,
      updated_at: new Date().toISOString()
    }).eq('id', recordId)

    // 7. Webhook notification (Optional, simulated here)
    // fetch(webhookUrl, { ... })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Processing error:', error)
    if (req.body) {
      const { recordId } = await req.json().catch(() => ({}))
      if (recordId) {
        await supabase.from('interview_audio_records').update({ 
          status: 'failed',
          analysis: { error: error.message }
        }).eq('id', recordId)
      }
    }
    return NextResponse.json({ error: 'Processing failed', details: error.message }, { status: 500 })
  }
}
