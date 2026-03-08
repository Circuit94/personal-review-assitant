import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: '未配置 OpenAI API Key，请在环境变量中设置 OPENAI_API_KEY' },
        { status: 500 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('audio') as File | null

    if (!file) {
      return NextResponse.json(
        { error: '请上传音频文件' },
        { status: 400 }
      )
    }

    const openai = new OpenAI({ apiKey })

    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
    })

    return NextResponse.json({ text: transcription.text })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '转录失败，请重试'
    console.error('Transcription error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
