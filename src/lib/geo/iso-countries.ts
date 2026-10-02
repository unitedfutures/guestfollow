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
