import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { isMissingColumn } from '@/lib/beds24/sync-write'

const MISSING = 'Google連携用の列がまだありません。Supabaseで supabase/add-google-business.sql を実行してください。'

// OAuthのクライアントID・シークレットを保存する（値は画面に返さない）
export async function PUT(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { client_id, client_secret } = await request.json().catch(() => ({}))
  const id = typeof client_id === 'string' ? client_id.trim() : ''
  const secret = typeof client_secret === 'string' ? client_secret.trim() : ''
  if (!id || !secret) return NextResponse.json({ error: 'クライアントIDとシークレットの両方を入力してください' }, { status: 400 })
  if (!id.endsWith('.apps.googleusercontent.com')) {
    return NextResponse.json({ error: 'クライアントIDの形式が正しくありません（.apps.googleusercontent.com で終わる値）' }, { status: 400 })
  }

  const { error } = await supabase.from('profiles')
    .update({ google_client_id: id, google_client_secret: secret, updated_at: new Date().toISOString() })
    .eq('id', user.id)
  if (error) {
    return NextResponse.json({ error: isMissingColumn(error, 'google_client_id') ? MISSING : error.message }, { status: 400 })
  }
  return NextResponse.json({ success: true })
}

// 連携解除（トークンとクライアント情報を削除）
export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase.from('profiles')
    .update({
      google_refresh_token: null, google_connected_email: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)
  if (error) {
    return NextResponse.json({ error: isMissingColumn(error, 'google_refresh_token') ? MISSING : error.message }, { status: 400 })
  }
  return NextResponse.json({ success: true })
}
