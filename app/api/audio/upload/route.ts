import { put } from '@vercel/blob'
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const userId = formData.get('userId') as string
    const title = formData.get('title') as string

    if (!file || !userId) {
      return NextResponse.json({ error: 'Missing file or userId' }, { status: 400 })
    }

    // 1. Upload to Vercel Blob
    const blob = await put(file.name, file, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN
    })

    // 2. Insert into database (using service role or client depends on setup, but here we use supabase client)
    // Note: client.ts uses anon key, which might fail RLS if not authenticated. 
    // In a real app, you'd use a server-side client with service role for background tasks.
    const { data, error } = await supabase
      .from('interview_audio_records')
      .insert({
        user_id: userId,
        title: title || file.name,
        file_url: blob.url,
        file_format: file.name.split('.').pop()?.toLowerCase() || 'mp3',
        file_size: file.size,
        status: 'pending'
      })
      .select()
      .single()

    if (error) throw error

    // 3. Trigger async processing (mocking async for now)
    // In a real app, this would be a message queue or a long-running background task
    // We'll call our own API asynchronously
    const processUrl = `${new URL(req.url).origin}/api/audio/process`
    fetch(processUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recordId: data.id, userId })
    }).catch(err => console.error('Failed to trigger background processing:', err))

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Upload failed', details: error.message }, { status: 500 })
  }
}
