import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getAirhostProperties } from '@/lib/airhost/client'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { account_id } = await request.json().catch(() => ({}))
  if (!account_id) {
    return NextResponse.json({ error: 'account_id は必須です' }, { status: 400 })
  }

  const { data: account } = await supabase
    .from('ota_accounts')
    .select('api_key, provider')
    .eq('id', account_id)
    .eq('user_id', user.id)
    .eq('provider', 'airhost')
    .single()

  if (!account?.api_key) {
    return NextResponse.json({ error: 'Airhostアカウントが見つかりません' }, { status: 404 })
  }

  let properties
  try {
    properties = await getAirhostProperties(account.api_key)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: `Airhostとの通信に失敗しました: ${msg}` }, { status: 502 })
  }

  if (!properties.length) {
    return NextResponse.json({ imported: 0, skipped: 0, message: 'Airhostに施設が登録されていません' })
  }

  // 既存施設の airhost_property_id を取得
  const { data: existing } = await supabase
    .from('facilities')
    .select('airhost_property_id')
    .eq('user_id', user.id)
    .not('airhost_property_id', 'is', null)

  const existingIds = new Set((existing ?? []).map(f => f.airhost_property_id))

  let imported = 0
  let skipped = 0

  for (const prop of properties) {
    if (existingIds.has(prop.id)) {
      skipped++
      continue
    }

    await supabase.from('facilities').insert({
      user_id: user.id,
      name: prop.name,
      address: prop.address || null,
      airhost_property_id: prop.id,
      ota_account_id: account_id,
    })

    imported++
  }

  return NextResponse.json({ imported, skipped, total: properties.length })
}
