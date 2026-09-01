import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getBookings } from '@/lib/beds24/client'
import { getAirhostBookings, pickAirhostChannel, pickAirhostPrice, pickAirhostOtaStatus } from '@/lib/airhost/client'

// 全施設の予約をサイトコントローラーから一括同期する
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: facilities } = await supabase
    .from('facilities')
    .select('id, name, beds24_property_id, airhost_property_id, ota_account_id')
    .eq('user_id', user.id)
    .or('beds24_property_id.not.is.null,airhost_property_id.not.is.null')

  if (!facilities?.length) {
    return NextResponse.json({ error: 'サイトコントローラーに連携された施設がありません' }, { status: 400 })
  }

  // アカウント別 APIキーをまとめて取得
  const { data: accounts } = await supabase
    .from('ota_accounts')
    .select('id, provider, api_key')
    .eq('user_id', user.id)

  const accountMap = new Map((accounts ?? []).map(a => [a.id, a]))

  // フォールバック用の旧プロフィールキー
  const { data: profile } = await supabase
    .from('profiles')
    .select('beds24_api_key, airhost_api_key')
    .eq('id', user.id)
    .single()

  const today = new Date()
  // 過去24ヶ月〜将来3ヶ月の予約を取り込む（売上レポート用に過去分も対象）
  const dateFrom = new Date(new Date().setMonth(today.getMonth() - 24)).toISOString().split('T')[0]
  const dateTo = new Date(new Date().setMonth(today.getMonth() + 3)).toISOString().split('T')[0]

  let totalSynced = 0
  let totalSkipped = 0
  const errors: string[] = []

  for (const f of facilities) {
    const account = f.ota_account_id ? accountMap.get(f.ota_account_id) : null

    // ── Beds24 ──
    if (f.beds24_property_id) {
      const apiKey = (account?.provider === 'beds24' ? account.api_key : null) ?? profile?.beds24_api_key
      if (!apiKey) {
        errors.push(`${f.name}: Beds24のAPIキーが見つかりません`)
      } else {
        try {
          const list = await getBookings(f.beds24_property_id, dateFrom, dateTo, apiKey)
          for (const b of list) {
            const { data: existing } = await supabase
              .from('bookings').select('id').eq('beds24_booking_id', b.bookId).single()
            if (existing) {
              await supabase.from('bookings').update({
                price: b.price, commission: b.commission, room_charge: b.roomCharge, guest_country: b.guestCountry || null, ota_status: b.otaStatus, ota_channel: b.channel || null,
              }).eq('id', existing.id)
              totalSkipped++
              continue
            }

            await supabase.from('bookings').insert({
              facility_id: f.id,
              user_id: user.id,
              beds24_booking_id: b.bookId,
              ota_source: 'beds24',
              ota_channel: b.channel || null,
              guest_email: b.guestEmail,
              guest_name: `${b.guestLastName} ${b.guestFirstName}`.trim(),
              checkin_date: b.firstNight,
              checkout_date: b.lastNight,
              num_guests: ((b.numAdult || 0) + (b.numChild || 0)) || 1,
              status: 'pending',
              price: b.price,
              commission: b.commission,
              room_charge: b.roomCharge,
              guest_country: b.guestCountry || null,
              ota_status: b.otaStatus,
            })
            totalSynced++
          }
        } catch (e) {
          errors.push(`${f.name}: Beds24同期エラー`)
        }
      }
    }

    // ── Airhost ──
    if (f.airhost_property_id) {
      const apiKey = (account?.provider === 'airhost' ? account.api_key : null) ?? profile?.airhost_api_key
      if (!apiKey) {
        errors.push(`${f.name}: AirhostのAPIキーが見つかりません`)
      } else {
        try {
          const list = await getAirhostBookings(f.airhost_property_id, dateFrom, dateTo, apiKey)
          for (const b of list) {
            const { data: existing } = await supabase
              .from('bookings').select('id').eq('airhost_booking_id', b.uid).single()
            if (existing) {
              await supabase.from('bookings').update({
                price: pickAirhostPrice(b), ota_status: pickAirhostOtaStatus(b), ota_channel: pickAirhostChannel(b) || null,
              }).eq('id', existing.id)
              totalSkipped++
              continue
            }

            await supabase.from('bookings').insert({
              facility_id: f.id,
              user_id: user.id,
              airhost_booking_id: b.uid,
              ota_source: 'airhost',
              ota_channel: pickAirhostChannel(b) || null,
              guest_email: b.guest_email,
              guest_name: b.guest_name,
              checkin_date: b.check_in,
              checkout_date: b.check_out,
              num_guests: b.number_of_guests || 1,
              status: 'pending',
              price: pickAirhostPrice(b),
              ota_status: pickAirhostOtaStatus(b),
            })
            totalSynced++
          }
        } catch (e) {
          errors.push(`${f.name}: Airhost同期エラー`)
        }
      }
    }
  }

  return NextResponse.json({
    facilities: facilities.length,
    synced: totalSynced,
    skipped: totalSkipped,
    errors,
  })
}
