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
    guest_country_guess: b.guestCountryGuess || null,
    guest_phone: b.guestPhone || null,
    ota_comments: b.comments || null,
    ota_notes: b.notes || null,
    ota_status: b.otaStatus,
    ota_channel: b.channel || null,
  }
}

type Payload = Record<string, unknown>

// 後から追加した列（SQLを実行していない環境では存在しないことがある）
const OPTIONAL_COLUMNS = [
  'invoice_total', 'guest_country_guess', 'guest_phone', 'ota_comments', 'ota_notes',
] as const

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

  // SQL未実行で列が無い場合は、その列を外して書き直す（同期自体は成功させる）
  let current = payload
  for (let i = 0; i < OPTIONAL_COLUMNS.length + 1; i++) {
    const { error } = await run(current)
    if (!error) return { error: null }
    const missing = OPTIONAL_COLUMNS.find(c => c in current && isMissingColumn(error, c))
    if (!missing) return { error }
    const { [missing]: _omitted, ...rest } = current
    current = rest
  }
  return { error: null }
}
