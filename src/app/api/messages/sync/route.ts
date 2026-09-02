import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getMessages } from '@/lib/beds24/client'
import { resolveBeds24Token } from '@/lib/ota/token'

// Beds24のメッセージを全予約分同期する
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Beds24予約のみ対象（beds24_booking_id あり）。
  // 予約1件ごとにBeds24へ問い合わせるため、対象を「チェックアウトが30日前以降」に絞り、上限も設ける
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, facility_id, beds24_booking_id, facilities(ota_account_id)')
    .eq('ota_source', 'beds24')
    .not('beds24_booking_id', 'is', null)
    .gte('checkout_date', since)
    .order('checkin_date', { ascending: false })
    .limit(300)

  if (!bookings?.length) {
    return NextResponse.json({ synced: 0, message: 'Beds24予約がありません' })
  }

  // 施設ごとにAPIキーをキャッシュ
  const keyCache = new Map<string, string | null>()
  let synced = 0
  const errors: string[] = []

  for (const b of bookings) {
    const facility = Array.isArray(b.facilities) ? b.facilities[0] : b.facilities
    let apiKey = keyCache.get(b.facility_id)
    if (apiKey === undefined) {
      // メッセージ読み取りは refresh token（書き込み可）を優先。無ければ Long Life Token。
      const { token } = await resolveBeds24Token(supabase, user.id, facility ?? {})
      apiKey = token
      keyCache.set(b.facility_id, apiKey)
    }
    if (!apiKey) continue

    let messages
    try {
      messages = await getMessages(apiKey, { bookingId: b.beds24_booking_id! })
    } catch (e) {
      // 個別予約のエラーは記録して続行（無言で成功扱いにしない）
      errors.push(`予約 ${b.beds24_booking_id}: ${e instanceof Error ? e.message : String(e)}`)
      continue
    }

    for (const m of messages) {
      if (!m.message) continue
      // OTA側IDが無いメッセージは重複判定できない（NULLは一意制約に掛からず毎回増える）ためスキップ
      if (!m.id) continue
      // guest→incoming, それ以外(host/channel/system)→outgoing扱い
      const direction = m.source === 'guest' ? 'incoming' : 'outgoing'

      const { error } = await supabase.from('messages').upsert({
        booking_id: b.id,
        facility_id: b.facility_id,
        user_id: user.id,
        ota_source: 'beds24',
        ota_message_id: m.id || null,
        direction,
        source: m.source || null,
        body: m.message,
        sent_at: m.time || new Date().toISOString(),
        read: direction === 'outgoing' ? true : m.read,
      }, { onConflict: 'ota_source,ota_message_id', ignoreDuplicates: true })

      if (!error) synced++
    }
  }

  return NextResponse.json({ synced, bookings: bookings.length, errors })
}
