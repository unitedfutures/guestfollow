// アンケートの「良かった点」（複数回答）の選択肢。
// 回答にはキーを保存し、表示時に各言語へ訳す（集計で言語差が出ないようにする）。
export const HIGHLIGHT_OPTIONS = [
  'location', 'cleanliness', 'facilities', 'bed', 'bath', 'kitchen',
  'view', 'quiet', 'value', 'host', 'parking', 'checkin',
] as const

export type HighlightKey = (typeof HIGHLIGHT_OPTIONS)[number]

/** 管理画面・AI生成で使う日本語ラベル */
export const HIGHLIGHT_LABELS_JA: Record<HighlightKey, string> = {
  location: '立地・アクセス',
  cleanliness: '清潔さ',
  facilities: '設備・アメニティ',
  bed: '寝具・寝心地',
  bath: 'お風呂',
  kitchen: 'キッチン',
  view: '眺望',
  quiet: '静かさ',
  value: 'コストパフォーマンス',
  host: '対応・連絡',
  parking: '駐車場',
  checkin: 'チェックインのしやすさ',
}

export const isHighlightKey = (v: unknown): v is HighlightKey =>
  typeof v === 'string' && (HIGHLIGHT_OPTIONS as readonly string[]).includes(v)
