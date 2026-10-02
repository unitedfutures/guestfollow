// ============================================================
// 宿泊実績報告の国籍区分
//   観光庁の宿泊旅行統計調査と同じ並び（21区分＋その他）で集計する。
//   国コード（OTAのゲスト国情報）と、名簿に手入力された国名の両方から判定する。
// ============================================================

import { isCountryCode } from '@/lib/geo/iso-countries'

export const OTHER_BUCKET = 'その他'
export const UNKNOWN_BUCKET = '国籍不明'

type Bucket = {
  label: string
  codes: string[]      // ISO 3166-1 alpha-2
  aliases: string[]    // 名簿の自由入力に出てくる表記
}

const BUCKETS: Bucket[] = [
  { label: '日本', codes: ['JP'], aliases: ['日本', '日本国', 'japan', 'japanese', 'jpn'] },
  { label: '韓国', codes: ['KR'], aliases: ['韓国', '大韓民国', '南朝鮮', 'korea', 'south korea', 'korean', 'kor'] },
  { label: '台湾', codes: ['TW'], aliases: ['台湾', '臺灣', 'taiwan', 'twn'] },
  { label: '香港', codes: ['HK'], aliases: ['香港', 'hong kong', 'hongkong', 'hkg'] },
  { label: '中国', codes: ['CN'], aliases: ['中国', '中華人民共和国', 'china', 'chinese', 'chn'] },
  { label: 'タイ', codes: ['TH'], aliases: ['タイ', 'thailand', 'thai', 'tha'] },
  { label: 'シンガポール', codes: ['SG'], aliases: ['シンガポール', 'singapore', 'sgp'] },
  { label: 'マレーシア', codes: ['MY'], aliases: ['マレーシア', 'malaysia', 'mys'] },
  { label: 'インドネシア', codes: ['ID'], aliases: ['インドネシア', 'indonesia', 'idn'] },
  { label: 'フィリピン', codes: ['PH'], aliases: ['フィリピン', 'philippines', 'phl'] },
  { label: 'ベトナム', codes: ['VN'], aliases: ['ベトナム', 'vietnam', 'viet nam', 'vnm'] },
  { label: 'インド', codes: ['IN'], aliases: ['インド', 'india', 'ind'] },
  { label: '英国', codes: ['GB', 'UK'], aliases: ['英国', 'イギリス', '連合王国', 'united kingdom', 'uk', 'britain', 'england', 'gbr'] },
  { label: 'ドイツ', codes: ['DE'], aliases: ['ドイツ', 'germany', 'german', 'deu'] },
  { label: 'フランス', codes: ['FR'], aliases: ['フランス', 'france', 'french', 'fra'] },
  { label: 'イタリア', codes: ['IT'], aliases: ['イタリア', 'italy', 'ita'] },
  { label: 'スペイン', codes: ['ES'], aliases: ['スペイン', 'spain', 'esp'] },
  { label: 'ロシア', codes: ['RU'], aliases: ['ロシア', 'russia', 'russian', 'rus'] },
  { label: '米国', codes: ['US'], aliases: ['米国', 'アメリカ', 'アメリカ合衆国', 'united states', 'usa', 'us', 'america', 'american'] },
  { label: 'カナダ', codes: ['CA'], aliases: ['カナダ', 'canada', 'can'] },
  { label: 'オーストラリア', codes: ['AU'], aliases: ['オーストラリア', '豪州', 'australia', 'aus'] },
]

/** 画面・CSV・PDFで使う列の並び（その他まで。国籍不明は別枠） */
export const NATIONALITY_BUCKETS: string[] = [...BUCKETS.map(b => b.label), OTHER_BUCKET]

/** 比較用に記号・空白を落として小文字化する */
const norm = (v: string) => v.toLowerCase().replace(/[\s・,.()（）\-_]/g, '')

const byCode = new Map<string, string>()
const byAlias = new Map<string, string>()
for (const b of BUCKETS) {
  for (const c of b.codes) byCode.set(c, b.label)
  for (const a of b.aliases) byAlias.set(norm(a), b.label)
  byAlias.set(norm(b.label), b.label)
}

/** 国コード（JP / US など）を区分に変換する。該当しない国は「その他」 */
export function bucketFromCountryCode(code: string | null | undefined): string {
  const c = (code ?? '').trim().toUpperCase()
  if (!c) return UNKNOWN_BUCKET
  const hit = byCode.get(c)
  if (hit) return hit
  // 実在しないコード（言語コードの混入など）は国籍不明として扱う
  return isCountryCode(c) ? OTHER_BUCKET : UNKNOWN_BUCKET
}

/**
 * 名簿に入力された国籍（自由入力）を区分に変換する。
 * 「アメリカ合衆国」「United States」「US」など表記ゆれを吸収し、
 * 判定できない入力は「その他」（外国人として集計する）。
 */
export function bucketFromNationality(value: string | null | undefined): string {
  const raw = (value ?? '').trim()
  if (!raw) return UNKNOWN_BUCKET
  const key = norm(raw)
  if (!key) return UNKNOWN_BUCKET

  // 完全一致を最優先（"us" が "australia" に含まれるような誤判定を避ける）
  const exact = byAlias.get(key)
  if (exact) return exact

  // 日本語表記は部分一致でも拾う（「アメリカ人」「中国（上海）」など）
  for (const [alias, label] of byAlias) {
    if (alias.length >= 2 && /[ぁ-んァ-ヶ一-龥]/.test(alias) && key.includes(alias)) return label
  }
  // 英語表記は語の先頭一致だけ許す（"japanese" → 日本）
  for (const [alias, label] of byAlias) {
    if (alias.length >= 4 && !/[ぁ-んァ-ヶ一-龥]/.test(alias) && key.startsWith(alias)) return label
  }
  // 2文字は国コードとみなす
  if (raw.length === 2) return bucketFromCountryCode(raw)
  return OTHER_BUCKET
}
