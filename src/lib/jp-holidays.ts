// ============================================================
// 日本の国民の祝日（振替休日・国民の休日を含む）を算出する。
//   1948年〜対応の簡易実装。1980-2099の春分/秋分は公式近似式で算出。
//   祝前日プライシングの判定に使用。
// ============================================================

const pad = (n: number) => String(n).padStart(2, '0')
const ymd = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`
const dow = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d)).getUTCDay() // 0=日
const nthMonday = (y: number, m: number, nth: number) => {
  const first = dow(y, m, 1)
  const firstMon = ((8 - first) % 7) + 1 // その月最初の月曜
  return firstMon + (nth - 1) * 7
}
// 春分日・秋分日（1980-2099 近似式）
const shunbun = (y: number) => Math.floor(20.8431 + 0.242194 * (y - 1980) - Math.floor((y - 1980) / 4))
const shubun = (y: number) => Math.floor(23.2488 + 0.242194 * (y - 1980) - Math.floor((y - 1980) / 4))

const holidayCache = new Map<number, Set<string>>()

function computeYear(y: number): Set<string> {
  const base = new Set<string>()
  const add = (m: number, d: number) => base.add(ymd(y, m, d))

  add(1, 1)                          // 元日
  add(1, nthMonday(y, 1, 2))         // 成人の日
  add(2, 11)                         // 建国記念の日
  if (y >= 2020) add(2, 23)          // 天皇誕生日（令和）
  add(3, shunbun(y))                 // 春分の日
  add(4, 29)                         // 昭和の日
  add(5, 3)                          // 憲法記念日
  add(5, 4)                          // みどりの日
  add(5, 5)                          // こどもの日
  add(7, nthMonday(y, 7, 3))         // 海の日
  add(8, 11)                         // 山の日
  add(9, nthMonday(y, 9, 3))         // 敬老の日
  add(9, shubun(y))                  // 秋分の日
  add(10, nthMonday(y, 10, 2))       // スポーツの日
  add(11, 3)                         // 文化の日
  add(11, 23)                        // 勤労感謝の日

  const result = new Set(base)

  // 国民の休日：前後が祝日で、その日が日曜でも祝日でもない平日
  for (let m = 1; m <= 12; m++) {
    const days = new Date(Date.UTC(y, m, 0)).getUTCDate()
    for (let d = 1; d <= days; d++) {
      const key = ymd(y, m, d)
      if (base.has(key)) continue
      if (dow(y, m, d) === 0) continue
      const prev = new Date(Date.UTC(y, m - 1, d - 1))
      const next = new Date(Date.UTC(y, m - 1, d + 1))
      const pk = ymd(prev.getUTCFullYear(), prev.getUTCMonth() + 1, prev.getUTCDate())
      const nk = ymd(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate())
      if (base.has(pk) && base.has(nk)) result.add(key)
    }
  }

  // 振替休日：祝日が日曜なら、直後の平日（祝日でない日）を休日に
  for (const key of [...result]) {
    const [yy, mm, dd] = key.split('-').map(Number)
    if (dow(yy, mm, dd) !== 0) continue
    const cur = new Date(Date.UTC(yy, mm - 1, dd))
    do {
      cur.setUTCDate(cur.getUTCDate() + 1)
    } while (result.has(ymd(cur.getUTCFullYear(), cur.getUTCMonth() + 1, cur.getUTCDate())))
    result.add(ymd(cur.getUTCFullYear(), cur.getUTCMonth() + 1, cur.getUTCDate()))
  }

  return result
}

export function jpHolidays(year: number): Set<string> {
  if (!holidayCache.has(year)) holidayCache.set(year, computeYear(year))
  return holidayCache.get(year)!
}

// 指定日（YYYY-MM-DD）が祝日か
export function isJpHoliday(dateStr: string): boolean {
  const y = Number(dateStr.slice(0, 4))
  return jpHolidays(y).has(dateStr)
}

// 「祝前日」判定：翌日が祝日ならその夜は祝前日
export function isPreHoliday(dateStr: string): boolean {
  const [y, m, d] = dateStr.split('-').map(Number)
  const next = new Date(Date.UTC(y, m - 1, d + 1))
  const nk = `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`
  return isJpHoliday(nk)
}
