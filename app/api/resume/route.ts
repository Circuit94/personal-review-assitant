import { get } from '@vercel/blob'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return new Response('Unauthorized', { status: 401 })
    }

    // Get the most recent resume
    const { data: resumes, error } = await supabase
      .from('resumes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)

    if (error || !resumes || resumes.length === 0) {
      return Response.json({ content: null })
    }

    const resume = resumes[0]

    // Try to read the PDF content from Blob storage
    try {
      const result = await get(resume.url, {
        access: 'private',
      })

      if (!result) {
        return Response.json({
          content: `简历文件: ${resume.filename}`,
          filename: resume.filename,
          url: resume.url,
        })
      }

      // For PDF files, we can't easily extract text without a library
      // So we return the filename and metadata instead
      return Response.json({
        content: `简历文件: ${resume.filename} (上传于 ${new Date(resume.created_at).toLocaleDateString('zh-CN')})`,
        filename: resume.filename,
        url: resume.url,
      })
    } catch {
      return Response.json({
        content: `简历文件: ${resume.filename}`,
        filename: resume.filename,
        url: resume.url,
      })
    }
  } catch (error) {
    console.error('Resume fetch error:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}
