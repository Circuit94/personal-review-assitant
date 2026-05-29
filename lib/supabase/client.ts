import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// 前端客户端：用于浏览器端操作，受 RLS 策略保护
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
