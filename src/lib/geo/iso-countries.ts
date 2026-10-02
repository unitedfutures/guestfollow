// ISO 3166-1 alpha-2 の国コード一覧。
// Beds24 の booking.country には言語コード（Airbnb経由の "ja" など）が入ることがあり、
// 国として扱うと誤った国籍になるため、実在する国コードかどうかをここで判定する。
const ISO_ALPHA2 = new Set(`
AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ
BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ
CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ
DE DJ DK DM DO DZ EC EE EG EH ER ES ET
FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY
HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT
JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ
LA LB LC LI LK LR LS LT LU LV LY
MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ
NA NC NE NF NG NI NL NO NP NR NU NZ OM
PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA
RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ
TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ
UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW
`.trim().split(/\s+/))

/** 実在する国コードか（大文字小文字は問わない） */
export function isCountryCode(value: string | null | undefined): boolean {
  const c = (value ?? '').trim().toUpperCase()
  return c.length === 2 && ISO_ALPHA2.has(c)
}

/**
 * 候補の中から最初の有効な国コードを返す（無ければ空文字）。
 * 言語コード（ja / en など）は国コードではないので採用しない。
 */
export function pickCountryCode(...candidates: (string | null | undefined)[]): string {
  for (const c of candidates) {
    const v = (c ?? '').trim().toUpperCase()
    if (isCountryCode(v)) return v
  }
  return ''
}

// ============================================================
// 国コードが取れない予約の推定
//   Airbnb経由などで国情報が無い場合に、言語と電話番号から国を推定する。
//   あくまで推定なので、確定した国コードとは別に保持する。
// ============================================================

// 話者がほぼ1国に限られる言語だけを対象にする（en/de/fr/es などは推定しない）
const LANG_TO_COUNTRY: Record<string, string> = {
  ja: 'JP', ko: 'KR', th: 'TH', vi: 'VN', id: 'ID', ru: 'RU', it: 'IT',
  zh: 'CN', 'zh-cn': 'CN', 'zh-hans': 'CN', 'zh-tw': 'TW', 'zh-hant': 'TW',
}

/** 電話番号から国を推定する。日本の携帯・固定番号（0始まり）と +81 に対応 */
export function countryFromPhone(phone: string | null | undefined): string {
  const raw = (phone ?? '').replace(/[^\d+]/g, '')
  if (!raw) return ''
  if (raw.startsWith('+81') || raw.startsWith('81')) return 'JP'
  // 国番号なしの国内表記（090/080/070/03 など）は日本とみなす
  if (/^0\d{8,10}$/.test(raw)) return 'JP'
  return ''
}

/** 言語コードから国を推定する（1国に特定できる言語のみ） */
export function countryFromLang(lang: string | null | undefined): string {
  const l = (lang ?? '').trim().toLowerCase()
  if (!l) return ''
  return LANG_TO_COUNTRY[l] ?? LANG_TO_COUNTRY[l.split(/[-_]/)[0]] ?? ''
}

/** 電話番号 → 言語 の順で国を推定する。推定できなければ空文字 */
export function guessCountryCode(phone: string | null | undefined, lang: string | null | undefined): string {
  return countryFromPhone(phone) || countryFromLang(lang)
}
