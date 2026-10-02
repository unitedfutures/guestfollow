import type { SupabaseClient } from '@supabase/supabase-js'
import type { Beds24Booking } from '@/lib/beds24/client'

/**
 * 同期のたびに更新する項目。
 * 金額やキャンセルだけでなく、日程・人数・氏名もBeds24側で変わるため毎回上書きする
 * （日程が変わると売上の計上月がずれるため）。
 */
export function beds24SyncedFields(b: Beds24Booking) {
  return {
    checkin_date: b.firstNight,
    checkout_date: b.lastNight,
    guest_name: `${b.guestLastName} ${b.guestFirstName}`.trim(),
    num_guests: ((b.numAdult || 0) + (b.numChild || 0)) || 1,
    price: b.price,
    commission: b.commission,
    room_charge: b.roomCharge,
    invoice_total: b.invoiceTotal,
    guest_country: b.guestCountry || null,
    ota_status: b.otaStatus,
    ota_channel: b.channel || null,
  }
}

type Payload = Record<string, unknown>

/** その列がまだ存在しないことによるエラーか */
export function isMissingColumn(error: { code?: string; message?: string } | null, column: string): boolean {
  if (!error) return false
  return error.code === '42703' || error.code === 'PGRST204' ||
    (!!error.message && error.message.includes(column) && /column|schema cache/i.test(error.message))
}

/**
 * 予約を書き込む。invoice_total 列がまだ無いデータベース（SQL未実行）では
 * その項目を外して書き直し、同期自体は成功させる。
 */
export async function writeBooking(
  supabase: SupabaseClient,
  payload: Payload,
  target?: { id: string },
): Promise<{ error: { message: string } | null }> {
  const run = (p: Payload) =>
    target
      ? supabase.from('bookings').update(p).eq('id', target.id)
      : supabase.from('bookings').insert(p)

  const { error } = await run(payload)
  // 列が無い場合のコードは経路で異なる（42703: Postgres / PGRST204: PostgRESTのスキーマキャッシュ）
  if (isMissingColumn(error, 'invoice_total') && 'invoice_total' in payload) {
    const { invoice_total: _omitted, ...rest } = payload
    const retry = await run(rest)
    return { error: retry.error }
  }
  return { error }
}
