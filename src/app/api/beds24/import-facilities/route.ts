import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getProperties } from '@/lib/beds24/client'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { account_id } = await request.json().catch(() => ({}))
  if (!account_id) {
    return NextResponse.json({ error: 'account_id は必須です' }, { status: 400 })
  }

  // 指定アカウントの api_key を取得（RLSで自分のアカウントのみ）
  const { data: account } = await supabase
    .from('ota_accounts')
    .select('api_key, provider')
    .eq('id', account_id)
    .eq('user_id', user.id)
    .eq('provider', 'beds24')
    .single()

  if (!account?.api_key) {
    return NextResponse.json({ error: 'Beds24アカウントが見つかりません' }, { status: 404 })
  }

  let properties
  try {
    properties = await getProperties(account.api_key)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: `Beds24との通信に失敗しました: ${msg}` }, { status: 502 })
  }

  if (!properties.length) {
    return NextResponse.json({ imported: 0, skipped: 0, message: 'Beds24に物件が登録されていません' })
  }

  // 既存施設の beds24_property_id を取得
  const { data: existing } = await supabase
    .from('facilities')
    .select('beds24_property_id')
    .eq('user_id', user.id)
    .not('beds24_property_id', 'is', null)

  const existingIds = new Set((existing ?? []).map(f => f.beds24_property_id))

  let imported = 0
  let skipped = 0

  for (const prop of properties) {
    if (existingIds.has(prop.propId)) {
      skipped++
      continue
    }

    const address = [prop.address, prop.city, prop.country].filter(Boolean).join(' ')

    await supabase.from('facilities').insert({
      user_id: user.id,
      name: prop.name,
      address: address || null,
      beds24_property_id: prop.propId,
      ota_account_id: account_id,
    })

    imported++
  }

  return NextResponse.json({ imported, skipped, total: properties.length })
}
