// ISO 3166-1 alpha-2 国コード → 日本語国名（主要国。未収載はコードを大文字で返す）
const COUNTRY_JA: Record<string, string> = {
  JP: '日本', US: 'アメリカ', CN: '中国', KR: '韓国', TW: '台湾', HK: '香港', MO: 'マカオ',
  GB: 'イギリス', FR: 'フランス', DE: 'ドイツ', IT: 'イタリア', ES: 'スペイン', PT: 'ポルトガル',
  NL: 'オランダ', BE: 'ベルギー', CH: 'スイス', AT: 'オーストリア', SE: 'スウェーデン', NO: 'ノルウェー',
  DK: 'デンマーク', FI: 'フィンランド', IE: 'アイルランド', PL: 'ポーランド', CZ: 'チェコ', GR: 'ギリシャ',
  RU: 'ロシア', UA: 'ウクライナ', TR: 'トルコ',
  CA: 'カナダ', MX: 'メキシコ', BR: 'ブラジル', AR: 'アルゼンチン', CL: 'チリ',
  AU: 'オーストラリア', NZ: 'ニュージーランド',
  TH: 'タイ', VN: 'ベトナム', PH: 'フィリピン', MY: 'マレーシア', SG: 'シンガポール', ID: 'インドネシア',
  IN: 'インド', BD: 'バングラデシュ', NP: 'ネパール', LK: 'スリランカ', PK: 'パキスタン',
  AE: 'アラブ首長国連邦', SA: 'サウジアラビア', IL: 'イスラエル', QA: 'カタール',
  ZA: '南アフリカ', EG: 'エジプト',
  GU: 'グアム', MP: '北マリアナ諸島', PF: 'フランス領ポリネシア',
}

export function countryNameJa(code: string | null | undefined): string {
  if (!code) return ''
  const c = code.trim().toUpperCase()
  if (!c) return ''
  return COUNTRY_JA[c] ?? c
}

export function isJapan(code: string | null | undefined): boolean {
  return (code ?? '').trim().toUpperCase() === 'JP'
}
