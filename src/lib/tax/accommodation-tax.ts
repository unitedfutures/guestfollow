// ============================================================
// 宿泊税ルールの型・プリセット・計算ロジック
//   - tiered : 1人1泊あたりの宿泊料で段階判定し、1人1泊あたりの定額を課税
//   - percent: 宿泊料に対する定率課税
// 課税標準（base）は「宿泊料のみ（清掃料等を除く）」を想定。
// ============================================================

export type TaxTier = { upTo: number | null; amount: number } // upTo未満に amount（円/人泊）。null=以上すべて
export type AccommodationTax =
  | { enabled: false }
  | { enabled: true; type: 'tiered'; label?: string; tiers: TaxTier[] }
  | { enabled: true; type: 'percent'; label?: string; percent: number }

export function isTaxEnabled(t: AccommodationTax | null | undefined): boolean {
  return !!t && t.enabled === true
}

// 主要自治体プリセット（2024年時点の代表例。最新の条例は各自治体でご確認ください）
export const TAX_PRESETS: { key: string; label: string; config: AccommodationTax }[] = [
  {
    key: 'tokyo', label: '東京都',
    config: { enabled: true, type: 'tiered', label: '東京都', tiers: [
      { upTo: 10000, amount: 0 }, { upTo: 15000, amount: 100 }, { upTo: null, amount: 200 },
    ] },
  },
  {
    key: 'osaka', label: '大阪府',
    config: { enabled: true, type: 'tiered', label: '大阪府', tiers: [
      { upTo: 7000, amount: 0 }, { upTo: 15000, amount: 100 }, { upTo: 20000, amount: 200 }, { upTo: null, amount: 300 },
    ] },
  },
  {
    key: 'kyoto', label: '京都市',
    config: { enabled: true, type: 'tiered', label: '京都市', tiers: [
      { upTo: 20000, amount: 200 }, { upTo: 50000, amount: 500 }, { upTo: null, amount: 1000 },
    ] },
  },
  {
    key: 'kanazawa', label: '金沢市',
    config: { enabled: true, type: 'tiered', label: '金沢市', tiers: [
      { upTo: 20000, amount: 200 }, { upTo: null, amount: 500 },
    ] },
  },
  {
    key: 'fukuoka_city', label: '福岡市',
    config: { enabled: true, type: 'tiered', label: '福岡市', tiers: [
      { upTo: 20000, amount: 200 }, { upTo: null, amount: 500 },
    ] },
  },
  {
    key: 'kutchan', label: '倶知安町（定率2%）',
    config: { enabled: true, type: 'percent', label: '倶知安町', percent: 2 },
  },
]

// 1人1泊あたりの宿泊料から、tieredの1人1泊税額を求める
function tierAmount(tiers: TaxTier[], perPersonPerNight: number): number {
  for (const t of tiers) {
    if (t.upTo === null) return t.amount
    if (perPersonPerNight < t.upTo) return t.amount
  }
  return tiers.length ? tiers[tiers.length - 1].amount : 0
}

/**
 * 予約1件・期間内の宿泊税を計算する。
 * @param base       課税標準（宿泊料。全宿泊分）
 * @param guests     宿泊人数
 * @param totalNights 予約全体の泊数（1人1泊単価の算出に使用）
 * @param nightsInPeriod 対象期間内に含まれる泊数（課税対象の泊数）
 */
export function computeTax(
  config: AccommodationTax,
  base: number,
  guests: number,
  totalNights: number,
  nightsInPeriod: number
): number {
  if (!config.enabled) return 0
  if (guests <= 0 || totalNights <= 0 || nightsInPeriod <= 0 || base <= 0) return 0

  if (config.type === 'percent') {
    // 期間按分した宿泊料に定率
    const chargeInPeriod = base * (nightsInPeriod / totalNights)
    return Math.round(chargeInPeriod * (config.percent / 100))
  }
  // tiered: 1人1泊あたりの宿泊料で段階判定
  const perPPN = base / (guests * totalNights)
  const amount = tierAmount(config.tiers, perPPN)
  return amount * guests * nightsInPeriod
}
