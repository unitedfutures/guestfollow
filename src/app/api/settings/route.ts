import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PUT(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  // 送られてきた項目だけ更新（未送信の項目を null で上書きしない）
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const k of ['company_name', 'beds24_api_key', 'airhost_api_key'] as const) {
    if (body[k] !== undefined) patch[k] = body[k]
  }

  const { error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
