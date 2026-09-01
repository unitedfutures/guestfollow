/**
 * Airhost Connect API クライアント
 * API仕様: https://api-connect.airhost.co/api/v1/
 *
 * ※ Airhostの実際のAPIキーと物件IDはダッシュボード > 設定 > 外部連携から設定してください。
 */

const AIRHOST_BASE_URL = 'https://api-connect.airhost.co/api/v1'

async function airhostFetch(path: string, apiKey: string) {
  const res = await fetch(`${AIRHOST_BASE_URL}${path}`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Airhost API error ${res.status}: ${text}`)
  }

  return res.json()
}

export interface AirhostProperty {
  id: string
  name: string
  address?: string
}

export interface AirhostBooking {
  uid: string           // 予約ID
  property_id: string   // 物件ID
  guest_name: string    // ゲスト氏名
  guest_email: string   // ゲストメール
  check_in: string      // チェックイン日 (YYYY-MM-DD)
  check_out: string     // チェックアウト日 (YYYY-MM-DD)
  number_of_guests: number
  status: string        // confirmed / cancelled など
  // 予約元OTA（Airbnb / Booking.com など）。Airhostのレスポンス仕様に応じて複数キーを許容
  channel?: string
  platform?: string
  ota_name?: string
  ota_type?: string
  source?: string
  // 金額（レスポンス仕様に応じて複数キーを許容）
  price?: number | string
  total_price?: number | string
  amount?: number | string
  total_amount?: number | string
}

// AirhostレスポンスからOTAチャネル名を推定して取り出す
export function pickAirhostChannel(b: AirhostBooking): string {
  return String(b.channel ?? b.platform ?? b.ota_name ?? b.ota_type ?? b.source ?? '')
}

// Airhostレスポンスから金額を推定して取り出す
export function pickAirhostPrice(b: AirhostBooking): number {
  const v = b.price ?? b.total_price ?? b.amount ?? b.total_amount ?? 0
  return Number(v) || 0
}

// 'cancelled' 系を判定
export function pickAirhostOtaStatus(b: AirhostBooking): string {
  return String(b.status ?? '').toLowerCase().includes('cancel') ? 'cancelled' : 'confirmed'
}

export async function getAirhostProperties(apiKey: string): Promise<AirhostProperty[]> {
  const data = await airhostFetch('/properties', apiKey)
  return data.properties ?? data ?? []
}

export async function getAirhostBookings(
  propertyId: string,
  dateFrom: string,
  dateTo: string,
  apiKey: string
): Promise<AirhostBooking[]> {
  const params = new URLSearchParams({
    property_id: propertyId,
    check_in_start: dateFrom,
    check_in_end: dateTo,
    status: 'confirmed',
  })
  const data = await airhostFetch(`/bookings?${params}`, apiKey)
  return data.bookings ?? data ?? []
}
