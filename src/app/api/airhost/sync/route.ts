import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getAirhostBookings, pickAirhostChannel, pickAirhostPrice, pickAirhostOtaStatus } from '@/lib/airhost/client'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { facility_id } = await request.json()
  if (!facility_id) return NextResponse.json({ error: 'facility_id is required' }, { status: 400 })

  const { data: facility } = await supabase
    .from('facilities')
    .select('airhost_property_id, name, ota_account_id')
    .eq('id', facility_id)
    .eq('user_id', user.id)
    .single()

  if (!facility?.airhost_property_id) {
    return NextResponse.json({ error: 'Airhost Property IDが設定されていません。施設設定から登録してください。' }, { status: 400 })
  }

  // ota_account_id から api_key を取得、なければ profiles にフォールバック
  let apiKey: string | null = null

  if (facility.ota_account_id) {
    const { data: account } = await supabase
      .from('ota_accounts')
      .select('api_key')
      .eq('id', facility.ota_account_id)
      .single()
    apiKey = account?.api_key ?? null
  }

  if (!apiKey) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('airhost_api_key')
      .eq('id', user.id)
      .single()
    apiKey = profile?.airhost_api_key ?? null
  }

  if (!apiKey) {
    return NextResponse.json({ error: 'Airhost APIキーが設定されていません。設定ページからアカウントを追加してください。' }, { status: 400 })
  }

  const today = new Date()
  // 過去24ヶ月〜将来3ヶ月の予約を同期する（売上レポート用に過去分も対象）
  const dateFrom = new Date(new Date().setMonth(today.getMonth() - 24)).toISOString().split('T')[0]
  const dateTo = new Date(new Date().setMonth(today.getMonth() + 3)).toISOString().split('T')[0]

  let airhostBookings
  try {
    airhostBookings = await getAirhostBookings(
      facility.airhost_property_id,
      dateFrom,
      dateTo,
      apiKey
    )
  } catch (e) {
    return NextResponse.json({ error: 'Airhostとの通信に失敗しました。APIキーを確認してください。' }, { status: 502 })
  }

  let synced = 0
  let skipped = 0

  for (const b of airhostBookings) {
    const { data: existing } = await supabase
      .from('bookings')
      .select('id')
      .eq('airhost_booking_id', b.uid)
      .single()

    if (existing) {
      await supabase.from('bookings').update({
        price:       pickAirhostPrice(b),
        ota_status:  pickAirhostOtaStatus(b),
        ota_channel: pickAirhostChannel(b) || null,
      }).eq('id', existing.id)
      skipped++
      continue
    }

    await supabase.from('bookings').insert({
      facility_id,
      user_id:            user.id,
      airhost_booking_id: b.uid,
      ota_source:         'airhost',
      ota_channel:        pickAirhostChannel(b) || null,
      guest_email:        b.guest_email,
      guest_name:         b.guest_name,
      checkin_date:       b.check_in,
      checkout_date:      b.check_out,
      num_guests:         b.number_of_guests || 1,
      status:             'pending',
      price:              pickAirhostPrice(b),
      ota_status:         pickAirhostOtaStatus(b),
    })

    synced++
  }

  return NextResponse.json({ synced, skipped, total: airhostBookings.length })
}
