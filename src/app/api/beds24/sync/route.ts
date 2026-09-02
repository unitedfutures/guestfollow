import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getBookings } from '@/lib/beds24/client'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { facility_id } = await request.json()
  if (!facility_id) return NextResponse.json({ error: 'facility_id is required' }, { status: 400 })

  const { data: facility } = await supabase
    .from('facilities')
    .select('beds24_property_id, name, ota_account_id')
    .eq('id', facility_id)
    .eq('user_id', user.id)
    .single()

  if (!facility?.beds24_property_id) {
    return NextResponse.json({ error: 'Beds24 Property IDが設定されていません。施設設定から登録してください。' }, { status: 400 })
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
      .select('beds24_api_key')
      .eq('id', user.id)
      .single()
    apiKey = profile?.beds24_api_key ?? null
  }

  if (!apiKey) {
    return NextResponse.json({ error: 'Beds24 APIキーが設定されていません。設定ページからアカウントを追加してください。' }, { status: 400 })
  }

  const today = new Date()
  // 過去24ヶ月〜将来3ヶ月の予約を同期する（売上レポート用に過去分も対象）
  const dateFrom = new Date(new Date().setMonth(today.getMonth() - 24)).toISOString().split('T')[0]
  const dateTo = new Date(new Date().setMonth(today.getMonth() + 3)).toISOString().split('T')[0]

  let beds24Bookings
  try {
    beds24Bookings = await getBookings(facility.beds24_property_id, dateFrom, dateTo, apiKey)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: `Beds24との通信に失敗しました: ${msg}` }, { status: 502 })
  }

  let synced = 0
  let skipped = 0

  for (const b of beds24Bookings) {
    // 既存判定は0件が正常系なので maybeSingle
    const { data: existing } = await supabase
      .from('bookings')
      .select('id')
      .eq('beds24_booking_id', b.bookId)
      .maybeSingle()

    // 既存予約は金額・OTAステータス・チャネルを更新（キャンセル反映）
    if (existing) {
      await supabase.from('bookings').update({
        price:       b.price,
        commission:  b.commission,
        room_charge: b.roomCharge,
        guest_country: b.guestCountry || null,
        ota_status:  b.otaStatus,
        ota_channel: b.channel || null,
      }).eq('id', existing.id)
      skipped++
      continue
    }

    const guestName = `${b.guestLastName} ${b.guestFirstName}`.trim()
    const numGuests = (b.numAdult || 0) + (b.numChild || 0)

    const { error: insErr } = await supabase.from('bookings').insert({
      facility_id,
      user_id:           user.id,
      beds24_booking_id: b.bookId,
      ota_source:        'beds24',
      ota_channel:       b.channel || null,
      guest_email:       b.guestEmail,
      guest_name:        guestName,
      checkin_date:      b.firstNight,
      checkout_date:     b.lastNight,
      num_guests:        numGuests || 1,
      status:            'pending',
      price:             b.price,
      commission:        b.commission,
      room_charge:       b.roomCharge,
      guest_country:     b.guestCountry || null,
      ota_status:        b.otaStatus,
    })
    // 失敗（一意制約違反など）は成功件数に数えない
    if (insErr) { console.error('[beds24/sync] insert error:', b.bookId, insErr.message); continue }

    synced++
  }

  return NextResponse.json({ synced, skipped, total: beds24Bookings.length })
}
