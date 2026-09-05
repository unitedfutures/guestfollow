// 売上レポートのPDF出力。
// 印刷ダイアログを経由せず、クリックしたその場でPDFをダウンロードする。
//
// 文字は画像ではなくテキストとして埋め込むため、PDF内で検索・コピーができる。
// 日本語フォント（IBM Plex Sans JP / OFL）は /public/fonts に置き、出力時にだけ読み込む。
//
// ※ pdf-lib の subset:true は日本語フォントだと字形の対応表が壊れて
//    ほとんどの文字が表示されなくなるため使わない（既知の不具合）。
//    フォントを丸ごと埋め込むぶん1ファイル1.5MB前後になるが、
//    確実に全文字が出ること・検索できることを優先している。

import type { PDFPage, RGB } from 'pdf-lib'

export type ReportRow = {
  facility: string
  ota: string
  stay: string
  guest: string
  guests: number
  sales: number
  fee: number
  profit: number
  cancelled: boolean
}

export type ReportMeta = {
  title: string        // 例：売上レポート / 月次売上レポート（2026年8月）
  fileName: string     // 拡張子なし
  facilityName: string
  statusLabel: string
  rangeLabel: string
}

const FONT_URL = '/fonts/IBMPlexSansJP-Regular.ttf'

// A4（ポイント）
const PAGE_W = 595.28
const PAGE_H = 841.89
const MARGIN = 40
const CONTENT_W = PAGE_W - MARGIN * 2

// 明細テーブルの列幅（合計が CONTENT_W になるようにする）
const COLS = [
  { key: 'facility', label: '施設',            w: 92, align: 'left' },
  { key: 'ota',      label: 'OTA',             w: 68, align: 'left' },
  { key: 'stay',     label: 'チェックイン〜アウト', w: 96, align: 'left' },
  { key: 'guest',    label: '予約名',          w: 79, align: 'left' },
  { key: 'guests',   label: '人数',            w: 26, align: 'center' },
  { key: 'sales',    label: '売上',            w: 52, align: 'right' },
  { key: 'fee',      label: 'OTA手数料',       w: 52, align: 'right' },
  { key: 'profit',   label: '粗利益',          w: 50, align: 'right' },
] as const

const ROW_H = 15
const HEAD_H = 17
const FS_ROW = 7.5
const FS_HEAD = 7

const yen = (n: number) => `¥${Math.round(n).toLocaleString('ja-JP')}`

// 日付を「2026年8月24日 〜 2026年8月26日」から桁数の少ない形へ（列幅に収めるため）
function compactStay(stay: string): string {
  const ds = stay.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/g)
  if (!ds || ds.length < 2) return stay
  const parse = (s: string) => {
    const m = s.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/)!
    return { y: m[1], m: m[2].padStart(2, '0'), d: m[3].padStart(2, '0') }
  }
  const a = parse(ds[0]), b = parse(ds[1])
  const tail = a.y === b.y ? `${b.m}/${b.d}` : `${b.y}/${b.m}/${b.d}`
  return `${a.y}/${a.m}/${a.d} 〜 ${tail}`
}

// フォントは一度読み込んだら使い回す
let fontBytesPromise: Promise<ArrayBuffer> | null = null
function loadFontBytes(): Promise<ArrayBuffer> {
  if (!fontBytesPromise) {
    fontBytesPromise = fetch(FONT_URL)
      .then(res => {
        if (!res.ok) throw new Error(`日本語フォントを読み込めませんでした（${res.status}）`)
        return res.arrayBuffer()
      })
      .catch(err => {
        fontBytesPromise = null   // 次回やり直せるようにする
        throw err
      })
  }
  return fontBytesPromise
}

export async function downloadReportPdf(rows: ReportRow[], meta: ReportMeta): Promise<void> {
  // 出力時にだけ読み込む（通常の画面表示を重くしないため）
  const [{ PDFDocument, rgb }, fontkitMod, fontBytes] = await Promise.all([
    import('pdf-lib'),
    import('@pdf-lib/fontkit'),
    loadFontBytes(),
  ])

  const doc = await PDFDocument.create()
  doc.registerFontkit(fontkitMod.default ?? fontkitMod)
  // subset:true は使わない（上のコメント参照）
  const font = await doc.embedFont(fontBytes, { subset: false })

  const ink = rgb(0.12, 0.16, 0.23)      // #1e293b
  const body = rgb(0.12, 0.13, 0.15)
  const muted = rgb(0.42, 0.45, 0.5)     // #6b7280
  const line = rgb(0.9, 0.91, 0.92)      // #e5e7eb
  const headLine = rgb(0.8, 0.84, 0.88)  // #cbd5e1
  const brand = rgb(0.39, 0.4, 0.95)     // #6366f1
  const amber = rgb(0.71, 0.33, 0.04)    // #b45309
  const indigo = rgb(0.26, 0.22, 0.79)   // #4338ca
  const zebra = rgb(0.97, 0.98, 0.99)    // #f8fafc
  const softIndigo = rgb(0.93, 0.95, 1)  // #eef2ff
  const faint = rgb(0.61, 0.64, 0.69)    // #9ca3af

  const totals = {
    sales: rows.reduce((s, r) => s + r.sales, 0),
    fee: rows.reduce((s, r) => s + r.fee, 0),
    profit: rows.reduce((s, r) => s + r.profit, 0),
    count: rows.length,
  }

  const width = (t: string, size: number) => font.widthOfTextAtSize(t, size)

  /** 幅に収まらない文字列は末尾を「…」で詰める */
  const fit = (text: string, maxW: number, size: number): string => {
    if (width(text, size) <= maxW) return text
    let s = text
    while (s.length > 1 && width(s + '…', size) > maxW) s = s.slice(0, -1)
    return s + '…'
  }

  type TextOpts = { size?: number; color?: RGB; align?: 'left' | 'center' | 'right'; bold?: boolean; maxW?: number }
  const draw = (page: PDFPage, text: string, x: number, y: number, opts: TextOpts = {}) => {
    const size = opts.size ?? FS_ROW
    const t = opts.maxW ? fit(text, opts.maxW, size) : text
    const w = width(t, size)
    const px = opts.align === 'right' ? x - w : opts.align === 'center' ? x - w / 2 : x
    const common = { x: px, y, size, font, color: opts.color ?? body }
    page.drawText(t, common)
    // 太字用のフェイスは持たないため、わずかにずらして二度描き太らせる
    if (opts.bold) page.drawText(t, { ...common, x: px + 0.25 })
    return w
  }

  const pages: PDFPage[] = []
  const newPage = () => {
    const p = doc.addPage([PAGE_W, PAGE_H])
    pages.push(p)
    return p
  }

  /** ページ見出しを描き、明細テーブルの開始Y座標を返す */
  const drawPageHeader = (page: PDFPage, isFirst: boolean): number => {
    if (!isFirst) {
      const y = PAGE_H - MARGIN - 8
      draw(page, `${meta.title}　／　${meta.facilityName}　／　${meta.rangeLabel}`, MARGIN, y, { size: 7.5, color: muted })
      page.drawLine({
        start: { x: MARGIN, y: y - 6 }, end: { x: PAGE_W - MARGIN, y: y - 6 },
        thickness: 0.8, color: headLine,
      })
      return y - 20
    }

    const top = PAGE_H - MARGIN
    draw(page, 'GuestFollow', MARGIN, top - 9, { size: 8.5, color: brand, bold: true })
    draw(page, meta.title, MARGIN, top - 27, { size: 15, color: ink, bold: true })

    const right = PAGE_W - MARGIN
    const today = new Date().toLocaleDateString('ja-JP')
    draw(page, `出力日：${today}`, right, top - 8, { size: 7.5, color: muted, align: 'right' })
    draw(page, `施設：${meta.facilityName}／ステータス：${meta.statusLabel}`, right, top - 19, { size: 7.5, color: muted, align: 'right' })
    draw(page, `期間：${meta.rangeLabel}`, right, top - 30, { size: 7.5, color: muted, align: 'right' })

    page.drawLine({
      start: { x: MARGIN, y: top - 38 }, end: { x: right, y: top - 38 },
      thickness: 1.5, color: ink,
    })

    // 集計カード
    const cardY = top - 38 - 12 - 46
    const gap = 9
    const cardW = (CONTENT_W - gap * 3) / 4
    const cards: { label: string; value: string; valueColor: RGB; fill?: RGB; border?: RGB }[] = [
      { label: '売上（総額）', value: yen(totals.sales), valueColor: ink },
      { label: 'OTA手数料', value: `−${yen(totals.fee)}`, valueColor: amber },
      { label: '粗利益（売上−手数料）', value: yen(totals.profit), valueColor: indigo, fill: softIndigo, border: rgb(0.78, 0.82, 0.98) },
      { label: '件数', value: `${totals.count}件`, valueColor: ink },
    ]
    cards.forEach((c, i) => {
      const x = MARGIN + (cardW + gap) * i
      page.drawRectangle({
        x, y: cardY, width: cardW, height: 46,
        color: c.fill, borderColor: c.border ?? line, borderWidth: 0.8,
      })
      draw(page, c.label, x + 8, cardY + 30, { size: 6.5, color: muted, maxW: cardW - 16 })
      draw(page, c.value, x + 8, cardY + 12, { size: 12, color: c.valueColor, bold: true, maxW: cardW - 16 })
    })

    return cardY - 18
  }

  /** テーブルの見出し行 */
  const drawTableHead = (page: PDFPage, y: number): number => {
    page.drawRectangle({ x: MARGIN, y: y - HEAD_H + 5, width: CONTENT_W, height: HEAD_H, color: zebra })
    let x = MARGIN
    for (const col of COLS) {
      const tx = col.align === 'right' ? x + col.w - 5 : col.align === 'center' ? x + col.w / 2 : x + 5
      draw(page, col.label, tx, y, { size: FS_HEAD, color: rgb(0.28, 0.33, 0.41), align: col.align, maxW: col.w - 8 })
      x += col.w
    }
    page.drawLine({
      start: { x: MARGIN, y: y - HEAD_H + 5 }, end: { x: PAGE_W - MARGIN, y: y - HEAD_H + 5 },
      thickness: 1.2, color: headLine,
    })
    return y - HEAD_H - 4
  }

  /** 明細1行 */
  const drawRow = (page: PDFPage, r: ReportRow, y: number) => {
    const cells: string[] = [
      r.facility, r.ota, compactStay(r.stay), r.guest, String(r.guests),
      yen(r.sales), r.fee ? `−${yen(r.fee)}` : '—', yen(r.profit),
    ]
    const colorFor = (i: number): RGB => {
      if (r.cancelled) return faint
      if (i === 1) return muted
      if (i === 6) return amber
      if (i === 7) return indigo
      return body
    }

    let x = MARGIN
    COLS.forEach((col, i) => {
      const tx = col.align === 'right' ? x + col.w - 5 : col.align === 'center' ? x + col.w / 2 : x + 5
      const w = draw(page, cells[i], tx, y, {
        size: FS_ROW, color: colorFor(i), align: col.align,
        maxW: col.w - 8, bold: i === 7 && !r.cancelled,
      })
      // キャンセルは取り消し線を引く
      if (r.cancelled && cells[i] !== '—') {
        const sx = col.align === 'right' ? tx - w : col.align === 'center' ? tx - w / 2 : tx
        page.drawLine({
          start: { x: sx, y: y + 2.6 }, end: { x: sx + w, y: y + 2.6 },
          thickness: 0.5, color: faint,
        })
      }
      x += col.w
    })

    page.drawLine({
      start: { x: MARGIN, y: y - 4.5 }, end: { x: PAGE_W - MARGIN, y: y - 4.5 },
      thickness: 0.5, color: line,
    })
  }

  // ── 本文の描画（下端に達したら改ページ） ──
  const FOOTER_RESERVE = 58   // 合計行＋注記のぶん
  const BOTTOM = MARGIN + 14

  let page = newPage()
  let y = drawTableHead(page, drawPageHeader(page, true))

  if (rows.length === 0) {
    draw(page, '該当する予約がありません', PAGE_W / 2, y - 12, { size: 8, color: faint, align: 'center' })
    y -= 30
  }

  rows.forEach((r, i) => {
    const isLastRow = i === rows.length - 1
    const needed = ROW_H + (isLastRow ? FOOTER_RESERVE : 0)
    if (y - needed < BOTTOM) {
      page = newPage()
      y = drawTableHead(page, drawPageHeader(page, false))
    }
    drawRow(page, r, y)
    y -= ROW_H
  })

  // 合計行
  if (y - FOOTER_RESERVE < BOTTOM) {
    page = newPage()
    y = drawTableHead(page, drawPageHeader(page, false))
  }
  page.drawRectangle({ x: MARGIN, y: y - 7, width: CONTENT_W, height: 18, color: zebra })
  page.drawLine({ start: { x: MARGIN, y: y + 11 }, end: { x: PAGE_W - MARGIN, y: y + 11 }, thickness: 1.5, color: ink })
  draw(page, `合計（${totals.count}件）`, MARGIN + 5, y, { size: FS_ROW, color: ink, bold: true })
  const rightEdges = COLS.reduce<number[]>((acc, c) => [...acc, (acc[acc.length - 1] ?? MARGIN) + c.w], [])
  draw(page, yen(totals.sales), rightEdges[4] - 5, y, { size: FS_ROW, color: ink, bold: true, align: 'right' })
  draw(page, `−${yen(totals.fee)}`, rightEdges[5] - 5, y, { size: FS_ROW, color: amber, bold: true, align: 'right' })
  draw(page, yen(totals.profit), rightEdges[6] - 5, y, { size: FS_ROW, color: indigo, bold: true, align: 'right' })
  y -= 24

  // 注記
  draw(page, '※ 売上＝OTA予約の総額。OTA手数料＝サイトコントローラー（Beds24）から取得した手数料の実額。粗利益＝売上−OTA手数料。', MARGIN, y, { size: 6.5, color: muted })
  draw(page, '※ 実際の入金額・振込タイミングはOTAにより異なります（Airbnbは粗利益が入金、Booking.comは売上が入金され後日手数料を支払い）。', MARGIN, y - 10, { size: 6.5, color: muted })

  // ページ番号
  if (pages.length > 1) {
    pages.forEach((p, i) => {
      draw(p, `${i + 1} / ${pages.length}`, PAGE_W - MARGIN, MARGIN - 6, { size: 6.5, color: faint, align: 'right' })
    })
  }

  doc.setTitle(meta.fileName)
  doc.setCreator('GuestFollow')

  const bytes = await doc.save()
  const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${meta.fileName}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}
