const BEDS24_BASE_URL = 'https://beds24.com/api/v2'

// ============================================================
// 認証（invite code → refresh token → access token）
//   - Long Life Token: 読み取り専用。api_key として保存し token ヘッダーにそのまま使う。
//   - Refresh Token: invite code を GET /authentication/setup で交換して取得（長寿命）。
//     GET /authentication/token で 24時間有効な access token を都度発行して使う。
// ============================================================

export interface Beds24SetupResult {
  refreshToken: string
  token: string          // 初回アクセストークン
  expiresIn: number      // 秒（通常 86400）
}

/**
 * invite code を refresh token + access token に交換する。
 * Beds24: GET /authentication/setup （ヘッダー code に invite code）
 * ※ invite code は24時間で失効し、交換は一度きり。
 */
export async function beds24SetupFromInviteCode(inviteCode: string): Promise<Beds24SetupResult> {
  const res = await fetch(`${BEDS24_BASE_URL}/authentication/setup`, {
    headers: { code: inviteCode.trim(), 'Content-Type': 'application/json' },
  })
  const text = await res.text()
  let json: Record<string, unknown> = {}
  try { json = JSON.parse(text) } catch { /* noop */ }

  if (!res.ok || json.success === false || !json.refreshToken) {
    const msg = (json.error as string) || text.slice(0, 200) || `HTTP ${res.status}`
    throw new Error(`invite codeの認証に失敗しました: ${msg}`)
  }
  return {
    refreshToken: String(json.refreshToken),
    token: String(json.token ?? ''),
    expiresIn: Number(json.expiresIn ?? 86400) || 86400,
  }
}

/**
 * refresh token から新しい access token を発行する。
 * Beds24: GET /authentication/token （ヘッダー refreshToken）
 */
export async function beds24RefreshAccessToken(
  refreshToken: string
): Promise<{ token: string; expiresIn: number }> {
  const res = await fetch(`${BEDS24_BASE_URL}/authentication/token`, {
    headers: { refreshToken: refreshToken.trim(), 'Content-Type': 'application/json' },
  })
  const text = await res.text()
  let json: Record<string, unknown> = {}
  try { json = JSON.parse(text) } catch { /* noop */ }

  if (!res.ok || json.success === false || !json.token) {
    const msg = (json.error as string) || text.slice(0, 200) || `HTTP ${res.status}`
    throw new Error(`アクセストークンの取得に失敗しました: ${msg}`)
  }
  return {
    token: String(json.token),
    expiresIn: Number(json.expiresIn ?? 86400) || 86400,
  }
}

/**
 * トークンのスコープ等の詳細を取得する（診断用）。
 * Beds24: GET /authentication/details
 */
export async function beds24TokenDetails(token: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${BEDS24_BASE_URL}/authentication/details`, {
    headers: { token, 'Content-Type': 'application/json' },
  })
  const text = await res.text()
  try { return JSON.parse(text) } catch { return { raw: text } }
}

export async function beds24Fetch(path: string, apiKey: string, options?: RequestInit) {
  const url = `${BEDS24_BASE_URL}${path}`
  const res = await fetch(url, {
    ...options,
    headers: {
      'token': apiKey,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  const text = await res.text()

  if (!res.ok) {
    throw new Error(`Beds24 API error ${res.status}: ${text}`)
  }

  try {
    return JSON.parse(text)
  } catch {
    throw new Error(`Beds24 API returned non-JSON: ${text.slice(0, 200)}`)
  }
}

// v2 のレスポンスは { success, type, count, pages, data: [...] } 形式
function unwrapData(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) return data
  const obj = data as { data?: unknown; success?: boolean; error?: string }
  if (obj?.success === false) {
    throw new Error(`Beds24 API error: ${obj.error ?? 'unknown'}`)
  }
  if (Array.isArray(obj?.data)) return obj.data as Record<string, unknown>[]
  return []
}

export interface Beds24Property {
  propId: string
  name: string
  address: string
  city: string
  country: string
}

export interface Beds24Booking {
  bookId: string
  propId: string
  roomId: string
  guestFirstName: string
  guestLastName: string
  guestEmail: string
  numAdult: number
  numChild: number
  firstNight: string  // YYYY-MM-DD
  lastNight: string   // YYYY-MM-DD
  status: string
  channel: string     // 予約元OTA（Airbnb / Booking.com / Direct など）
  price: number       // 予約総額 ＝ 売上
  commission: number  // OTA手数料（Beds24が返す実額。無ければ0）
  roomCharge: number  // 宿泊料のみ（清掃料等を除く。宿泊税の課税標準用）
  guestCountry: string // ゲストの国コード（ISO alpha-2、大文字。例 JP / US）
  otaStatus: string   // 'confirmed' | 'cancelled'
}

// invoiceItems から「宿泊料のみ」を算出（清掃料等の付帯費用を除く）
function roomChargeFromInvoiceItems(items: unknown, fallback: number): number {
  if (!Array.isArray(items) || items.length === 0) return fallback
  const isCleaning = (it: Record<string, unknown>) =>
    Number(it.subType) === 11 || /清掃|クリーニング|clean/i.test(String(it.description ?? ''))
  let charges = 0
  for (const raw of items) {
    const it = raw as Record<string, unknown>
    if (String(it.type) !== 'charge') continue
    if (isCleaning(it)) continue
    charges += Number(it.lineTotal ?? it.amount ?? 0) || 0
  }
  // 課金明細が1件も無い場合は総額にフォールバック
  return charges > 0 ? charges : fallback
}

// ============================================================
// 料金カレンダー（宿泊価格・最低宿泊日数）
// ============================================================

export interface Beds24Room {
  roomId: string
  name: string
  qty: number
}

export interface CalendarDay {
  date: string      // YYYY-MM-DD
  price: number | null   // price1（未設定=null）
  minStay: number | null
  numAvail: number | null
}

/** 物件の部屋一覧を取得 */
export async function getRooms(apiKey: string, propertyId: string): Promise<Beds24Room[]> {
  const raw = await beds24Fetch(`/properties?id=${encodeURIComponent(propertyId)}&includeAllRooms=true`, apiKey)
  const prop = (raw?.data ?? [])[0] ?? {}
  const rooms = (prop.roomTypes ?? prop.rooms ?? []) as Record<string, unknown>[]
  return rooms.map(r => ({
    roomId: String(r.id ?? ''),
    name: String(r.name ?? ''),
    qty: Number(r.qty ?? 1) || 1,
  }))
}

/** 部屋の料金カレンダーを取得（日別に正規化） */
export async function getRoomCalendar(
  apiKey: string, roomId: string, startDate: string, endDate: string
): Promise<CalendarDay[]> {
  const qs = new URLSearchParams({
    roomId, startDate, endDate,
    includePrices: 'true', includeNumAvail: 'true', includeMinStay: 'true',
  })
  const raw = await beds24Fetch(`/inventory/rooms/calendar?${qs}`, apiKey)
  const entries = ((raw?.data ?? [])[0]?.calendar ?? []) as Record<string, unknown>[]
  const map = new Map<string, CalendarDay>()
  const dnum = (s: string) => Math.floor(Date.parse(`${s}T00:00:00Z`) / 86400000)
  const dstr = (n: number) => new Date(n * 86400000).toISOString().split('T')[0]
  for (const e of entries) {
    const from = String(e.from ?? e.date ?? '')
    const to = String(e.to ?? e.date ?? from)
    if (!from) continue
    const price = e.price1 != null ? Number(e.price1) : null
    const minStay = e.minStay != null ? Number(e.minStay) : null
    const numAvail = e.numAvail != null ? Number(e.numAvail) : null
    for (let d = dnum(from); d <= dnum(to); d++) {
      map.set(dstr(d), { date: dstr(d), price, minStay, numAvail })
    }
  }
  return [...map.values()]
}

/** 料金カレンダーを更新（価格・最低宿泊日数）。書き込みスコープが必要。 */
export async function updateRoomCalendar(
  token: string,
  roomId: string,
  days: { date: string; price?: number | null; minStay?: number | null }[]
): Promise<void> {
  const calendar = days.map(d => {
    const entry: Record<string, unknown> = { from: d.date, to: d.date }
    if (d.price != null) entry.price1 = d.price
    if (d.minStay != null) entry.minStay = d.minStay
    return entry
  })
  const raw = await beds24Fetch('/inventory/rooms/calendar', token, {
    method: 'POST',
    body: JSON.stringify([{ roomId: Number(roomId) || roomId, calendar }]),
  })
  const arr = Array.isArray(raw) ? raw : (raw?.data ?? [])
  const first = arr[0]
  if (first && first.success === false) {
    throw new Error(first.errors?.[0]?.message ?? first.error ?? 'カレンダーの更新に失敗しました')
  }
}

/**
 * Beds24 v2: GET /properties
 * レスポンス: { success, type: "property", count, data: [{ id, name, address, city, country, ... }] }
 */
export async function getProperties(apiKey: string): Promise<Beds24Property[]> {
  const raw = await beds24Fetch('/properties', apiKey)
  const list = unwrapData(raw)
  return list.map(p => ({
    propId: String(p.id ?? ''),
    name: String(p.name ?? ''),
    address: String(p.address ?? ''),
    city: String(p.city ?? ''),
    country: String(p.country ?? ''),
  }))
}

/**
 * Beds24 v2: GET /bookings
 * クエリ: propertyId, arrivalFrom, arrivalTo
 * レスポンス: { success, data: [{ id, propertyId, roomId, status, arrival, departure,
 *   numAdult, numChild, firstName, lastName, email, ... }] }
 */
export async function getBookings(
  propertyId: string,
  dateFrom: string,
  dateTo: string,
  apiKey: string
): Promise<Beds24Booking[]> {
  const params = new URLSearchParams({
    propertyId: propertyId,
    arrivalFrom: dateFrom,
    arrivalTo: dateTo,
    includeInvoiceItems: 'true', // 宿泊料（課税標準）算出のため内訳を取得
  })
  const raw = await beds24Fetch(`/bookings?${params}`, apiKey)
  const list = unwrapData(raw)
  return list
    // 'black'（ブロック＝実予約ではない）のみ除外。cancelled は売上レポート用に取り込む
    .filter(b => String(b.status ?? '').toLowerCase() !== 'black')
    .map(b => {
      const status = String(b.status ?? '').toLowerCase()
      return {
        bookId: String(b.id ?? ''),
        propId: String(b.propertyId ?? ''),
        roomId: String(b.roomId ?? ''),
        guestFirstName: String(b.firstName ?? ''),
        guestLastName: String(b.lastName ?? ''),
        guestEmail: String(b.email ?? ''),
        numAdult: Number(b.numAdult ?? 0),
        numChild: Number(b.numChild ?? 0),
        firstNight: String(b.arrival ?? ''),
        lastNight: String(b.departure ?? ''),
        status: String(b.status ?? ''),
        channel: String(b.referer ?? b.channel ?? b.apiSourceText ?? ''),
        price: Number(b.price ?? 0) || 0,
        commission: Number(b.commission ?? b.commissionAmount ?? 0) || 0,
        roomCharge: roomChargeFromInvoiceItems(b.invoiceItems, Number(b.price ?? 0) || 0),
        guestCountry: String(b.country2 ?? b.country ?? '').trim().toUpperCase(),
        otaStatus: status === 'cancelled' ? 'cancelled' : 'confirmed',
      }
    })
}

export interface Beds24Message {
  id: string
  bookingId: string
  time: string       // ISO 8601
  source: string     // 'guest' | 'host' | 'channel' | 'system' など
  message: string
  read: boolean
}

/**
 * Beds24 v2: GET /bookings/messages
 * ※ bookings-personal スコープが必要。OTA予約のメッセージのみ対象。
 */
export async function getMessages(
  apiKey: string,
  opts: { bookingId?: string; maxAge?: number } = {}
): Promise<Beds24Message[]> {
  const params = new URLSearchParams()
  if (opts.bookingId) params.set('bookingId', opts.bookingId)
  if (opts.maxAge) params.set('maxAge', String(opts.maxAge))
  const qs = params.toString()
  const raw = await beds24Fetch(`/bookings/messages${qs ? `?${qs}` : ''}`, apiKey)
  const list = unwrapData(raw)
  return list.map(m => ({
    id: String(m.id ?? m.messageId ?? ''),
    bookingId: String(m.bookingId ?? ''),
    time: String(m.time ?? m.dateTime ?? ''),
    source: String(m.source ?? ''),
    message: String(m.message ?? ''),
    read: Boolean(m.read),
  }))
}

/**
 * Beds24 v2: POST /bookings/messages
 * ゲストへメッセージを送信する。
 */
export async function postMessage(
  apiKey: string,
  bookingId: string,
  message: string
): Promise<void> {
  const raw = await beds24Fetch('/bookings/messages', apiKey, {
    method: 'POST',
    body: JSON.stringify([{ bookingId: Number(bookingId) || bookingId, message }]),
  })
  // レスポンスは配列 [{ success, ... }] 形式
  const arr = Array.isArray(raw) ? raw : (raw?.data ?? [])
  const first = arr[0]
  if (first && first.success === false) {
    throw new Error(first.errors?.[0]?.message ?? first.error ?? 'メッセージ送信に失敗しました')
  }
}

/**
 * Raw fetch for diagnostics — returns the raw parsed JSON without mapping
 */
export async function beds24RawFetch(path: string, apiKey: string) {
  const url = `${BEDS24_BASE_URL}${path}`
  const res = await fetch(url, {
    headers: {
      'token': apiKey,
      'Content-Type': 'application/json',
    },
  })
  const text = await res.text()
  return { status: res.status, ok: res.ok, body: text }
}
