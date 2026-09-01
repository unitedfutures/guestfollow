import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { beds24SetupFromInviteCode } from '@/lib/beds24/client'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('ota_accounts')
    .select('id, provider, label, created_at, api_key, refresh_token')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  // トークン本体は返さず、設定済みかどうかのフラグだけ返す
  const safe = (data ?? []).map(a => ({
    id: a.id,
    provider: a.provider,
    label: a.label,
    created_at: a.created_at,
    has_longlife: !!a.api_key,
    has_refresh: !!a.refresh_token,
  }))
  return NextResponse.json(safe)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { provider, label, api_key } = await request.json()
  if (!provider || !api_key) {
    return NextResponse.json({ error: 'provider と api_key は必須です' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('ota_accounts')
    .insert({ user_id: user.id, provider, label: label ?? '', api_key })
    .select('id, provider, label, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// Refresh Token（invite code由来）の設定・解除
export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, invite_code, remove_refresh } = await request.json()
  if (!id) return NextResponse.json({ error: 'id は必須です' }, { status: 400 })

  // 対象アカウントが本人のものか確認
  const { data: account } = await supabase
    .from('ota_accounts')
    .select('id, provider')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()
  if (!account) return NextResponse.json({ error: 'アカウントが見つかりません' }, { status: 404 })
  if (account.provider !== 'beds24') {
    return NextResponse.json({ error: 'Refresh TokenはBeds24のみ対応しています' }, { status: 400 })
  }

  // 解除
  if (remove_refresh) {
    const { error } = await supabase
      .from('ota_accounts')
      .update({ refresh_token: null, access_token: null, access_token_expires_at: null })
      .eq('id', id)
      .eq('user_id', user.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, has_refresh: false })
  }

  // 設定：invite code を refresh token に交換
  if (!invite_code?.trim()) {
    return NextResponse.json({ error: 'invite code を入力してください' }, { status: 400 })
  }

  let setup
  try {
    setup = await beds24SetupFromInviteCode(invite_code)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const expiresAt = new Date(Date.now() + setup.expiresIn * 1000).toISOString()
  const { error } = await supabase
    .from('ota_accounts')
    .update({
      refresh_token: setup.refreshToken,
      access_token: setup.token || null,
      access_token_expires_at: setup.token ? expiresAt : null,
    })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, has_refresh: true })
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const { error } = await supabase
    .from('ota_accounts')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
