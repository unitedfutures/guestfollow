// ============================================================
// 経営管理ダッシュボードの集計
//   予約を「泊」に展開して月ごとに積み上げる。月をまたぐ予約も
//   泊数で按分するため、月次の売上・稼働率・ADRがずれない。
// ============================================================

export type BookingRow = {
  facility_id: string
  checkin_date: string
  checkout_date: string
  num_guests: number | null
  price: number | null           // 宿泊料（Beds24のprice）
  invoice_total?: number | null  // 請求合計（追加請求を含む）。無ければ price を使う
  commission: number | null
  ota_status: string | null
}

/** 売上として扱う金額。請求合計があればそれを、無ければ宿泊料を使う */
export const bookingRevenue = (b: BookingRow): number =>
  Number(b.invoice_total ?? b.price ?? 0) || 0

export type Kpi = {
  revenue: number      // 売上（泊単位で按分）
  commission: number   // OTA手数料
  roomNights: number   // 稼働室夜（= 稼働日数）
  guestNights: number  // 延べ宿泊人数（人泊）
  guests: number       // 宿泊客数（チェックイン月で計上）
  bookings: number     // 予約件数（チェックイン月で計上）
  capacity: number     // 販売可能室夜（施設数 × 日数）
}

export type MonthlyKpi = Kpi & {
  month: string        // YYYY-MM
  byFacility: Record<string, Kpi>
}

export const emptyKpi = (): Kpi => ({
  revenue: 0, commission: 0, roomNights: 0, guestNights: 0, guests: 0, bookings: 0, capacity: 0,
})

export const occupancy = (k: Kpi) => (k.capacity > 0 ? k.roomNights / k.capacity : 0)
export const adr = (k: Kpi) => (k.roomNights > 0 ? k.revenue / k.roomNights : 0)
/** RevPAR：販売可能室夜あたりの売上 */
export const revpar = (k: Kpi) => (k.capacity > 0 ? k.revenue / k.capacity : 0)

const pad = (n: number) => String(n).padStart(2, '0')
const daysInMonth = (y: number, m: number) => new Date(y, m, 0).getDate()

/** 今日（日本時間）の YYYY-MM-DD */
export function jstToday(now = new Date()): string {
  const jst = new Date(now.getTime() + 9 * 3600 * 1000)
  return jst.toISOString().slice(0, 10)
}

/** 基準月から前後に並ぶ月（YYYY-MM）の一覧をつくる */
export function monthRange(baseMonth: string, offsetFrom: number, count: number): string[] {
  const [y, m] = baseMonth.split('-').map(Number)
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(y, m - 1 + offsetFrom + i, 1)
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
  })
}

const addKpi = (target: Kpi, add: Partial<Kpi>) => {
  for (const [k, v] of Object.entries(add)) target[k as keyof Kpi] += v as number
}

/**
 * 予約を月×施設で集計する（チェックアウト日基準）。
 * - 1件の予約は、チェックアウト日が属する月にまとめて計上する
 *   （Beds24の集計や売上レポートと基準をそろえるため）
 * - 稼働率の分母は「施設数 × その月の日数」（1施設1室として扱う）
 */
export function aggregateByMonth(
  bookings: BookingRow[],
  months: string[],
  facilityIds: string[],
): MonthlyKpi[] {
  const index = new Map<string, MonthlyKpi>()
  for (const month of months) {
    const [y, m] = month.split('-').map(Number)
    const days = daysInMonth(y, m)
    const byFacility: Record<string, Kpi> = {}
    for (const id of facilityIds) byFacility[id] = { ...emptyKpi(), capacity: days }
    index.set(month, {
      ...emptyKpi(), month, byFacility,
      capacity: days * facilityIds.length,
    })
  }

  const facilitySet = new Set(facilityIds)

  for (const b of bookings) {
    if (b.ota_status === 'cancelled') continue
    if (!facilitySet.has(b.facility_id)) continue

    // チェックアウト月に計上する。対象期間外なら無視
    const month = (b.checkout_date ?? '').slice(0, 7)
    const target = index.get(month)
    if (!target) continue

    const start = Date.parse(`${b.checkin_date}T00:00:00Z`)
    const end = Date.parse(`${b.checkout_date}T00:00:00Z`)
    if (!Number.isFinite(start) || !Number.isFinite(end)) continue
    // 日帰り・同日チェックアウトも1泊として扱う
    const nights = Math.max(1, Math.round((end - start) / 86_400_000))
    const guests = Math.max(1, Number(b.num_guests) || 1)

    const add = {
      revenue: bookingRevenue(b),
      commission: Number(b.commission) || 0,
      roomNights: nights,
      guestNights: guests * nights,
      guests,
      bookings: 1,
    }
    addKpi(target, add)
    addKpi(target.byFacility[b.facility_id], add)
  }

  return months.map(m => index.get(m)!)
}

/** 月次の合計（期間全体のKPI）をつくる */
export function sumKpi(list: Kpi[]): Kpi {
  const total = emptyKpi()
  for (const k of list) addKpi(total, k)
  return total
}

/** 前期比（増減率）。母数が0のときは null */
export function growth(current: number, previous: number): number | null {
  if (!previous) return null
  return (current - previous) / previous
}
