import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const { messages, sessionId } = await req.json()

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return new Response('Unauthorized', { status: 401 })
    }

    // Save each message to the database
    const messagesToInsert = messages.map((msg: any) => ({
      user_id: user.id,
      session_id: sessionId || null,
      role: msg.role,
      content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
    }))

    const { error } = await supabase
      .from('chat_messages')
      .insert(messagesToInsert)

    if (error) throw error

    return Response.json({ success: true })
  } catch (error) {
    console.error('Save chat error:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}
