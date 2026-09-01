import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// 会話（予約単位）ごとの最新メッセージ一覧を返す
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: messages } = await supabase
    .from('messages')
    .select('id, booking_id, facility_id, ota_source, direction, source, body, sent_at, read')
    .order('sent_at', { ascending: false })

  return NextResponse.json(messages ?? [])
}
