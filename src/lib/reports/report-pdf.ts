// 売上レポートのPDF出力。
// 印刷ダイアログを経由せず、クリックしたその場でPDFをダウンロードする。
//
// 方式：レポートをA4サイズのHTMLとして1ページずつ組み立て、
//       非表示のiframeで描画 → 画像化 → PDFに1ページずつ貼る。
// 行の途中でページが切れないよう、ページごとの行数をこちら側で決めて分割する。

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

// A4（96dpi換算）
const PAGE_W = 794
const PAGE_H = 1123

// 1ページに載せる明細行数。1ページ目は見出しと集計カードがある分だけ少なくする。
// 最終ページには合計行と注記が入るため、余裕をもたせた値にしている。
const ROWS_FIRST_PAGE = 20
const ROWS_OTHER_PAGE = 28

const yen = (n: number) => `¥${Math.round(n).toLocaleString('ja-JP')}`

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string))

const STYLES = `
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; }
  html, body { margin:0; padding:0; }
  body { font-family: 'Hiragino Sans','Hiragino Kaku Gothic ProN','Yu Gothic','Meiryo','Helvetica Neue',Arial,sans-serif;
         color:#1f2937; font-size:12px; background:#fff; width:${PAGE_W}px; height:${PAGE_H}px; padding:30px; }
  .head { display:flex; justify-content:space-between; align-items:flex-end; border-bottom:2px solid #1e293b; padding-bottom:12px; margin-bottom:16px; }
  h1 { font-size:20px; margin:0; color:#1e293b; letter-spacing:.04em; }
  .brand { font-size:12px; color:#6366f1; font-weight:700; letter-spacing:.1em; margin-bottom:2px; }
  .meta { text-align:right; font-size:11px; color:#6b7280; line-height:1.7; }
  .cards { display:flex; gap:12px; margin-bottom:18px; }
  .card { flex:1; border:1px solid #e5e7eb; border-radius:10px; padding:12px 14px; }
  .card .l { font-size:10px; color:#6b7280; margin-bottom:4px; }
  .card .v { font-size:18px; font-weight:800; }
  .card.sales .v { color:#1e293b; } .card.fee .v { color:#b45309; }
  .card.profit { background:#eef2ff; border-color:#c7d2fe; } .card.profit .v { color:#4338ca; }
  table { width:100%; border-collapse:collapse; }
  th,td { padding:7px 8px; border-bottom:1px solid #e5e7eb; text-align:left; }
  th { background:#f8fafc; font-size:10px; color:#475569; border-bottom:1.5px solid #cbd5e1; }
  td.r,th.r { text-align:right; white-space:nowrap; } td.c,th.c { text-align:center; }
  td.ota { color:#6b7280; } td.fee { color:#b45309; } td.profit { font-weight:700; color:#4338ca; }
  tr.cancelled td { color:#9ca3af; text-decoration:line-through; }
  tfoot td { font-weight:800; border-top:2px solid #1e293b; background:#f8fafc; }
  .note { margin-top:14px; font-size:10px; color:#6b7280; line-height:1.7; }
  .pager { margin-top:10px; text-align:right; font-size:10px; color:#9ca3af; }
  .subhead { font-size:11px; color:#6b7280; border-bottom:1px solid #cbd5e1; padding-bottom:8px; margin-bottom:12px; }
`

const THEAD = `<thead><tr>
  <th>施設</th><th>OTA</th><th>チェックイン〜アウト</th><th>予約名</th><th class="c">人数</th>
  <th class="r">売上</th><th class="r">OTA手数料</th><th class="r">粗利益</th>
</tr></thead>`

const NOTE = `<div class="note">
  ※ 売上＝OTA予約の総額。OTA手数料＝サイトコントローラー（Beds24）から取得した手数料の実額。粗利益＝売上−OTA手数料。<br>
  ※ 実際の入金額・振込タイミングはOTAにより異なります（Airbnbは粗利益が入金、Booking.comは売上が入金され後日手数料を支払い）。
</div>`

function rowHtml(r: ReportRow): string {
  return `<tr class="${r.cancelled ? 'cancelled' : ''}">
    <td>${esc(r.facility)}</td>
    <td class="ota">${esc(r.ota)}</td>
    <td>${esc(r.stay)}</td>
    <td>${esc(r.guest)}</td>
    <td class="c">${esc(r.guests)}</td>
    <td class="r">${yen(r.sales)}</td>
    <td class="r fee">${r.fee ? '−' + yen(r.fee) : '—'}</td>
    <td class="r profit">${yen(r.profit)}</td>
  </tr>`
}

// 明細行はゲスト名や施設名が折り返して高さが変わるため、
// 行数を決め打ちにせず、実際に描画した高さを測って1ページに入る分だけ載せる。
const APPROX_ROW_H = 32

/** A4 1ページ分のHTMLを組み立てる */
function pageHtml(
  pageRows: ReportRow[],
  meta: ReportMeta,
  totals: { sales: number; fee: number; profit: number; count: number },
  pageIndex: number,
  pageCount: number
): string {
  const isFirst = pageIndex === 0
  const isLast = pageIndex === pageCount - 1
  const today = new Date().toLocaleDateString('ja-JP')

  const header = isFirst
    ? `<div class="head">
         <div><div class="brand">GuestFollow</div><h1>${esc(meta.title)}</h1></div>
         <div class="meta">
           出力日：${today}<br>施設：${esc(meta.facilityName)}／ステータス：${esc(meta.statusLabel)}<br>期間：${esc(meta.rangeLabel)}
         </div>
       </div>
       <div class="cards">
         <div class="card sales"><div class="l">売上（総額）</div><div class="v">${yen(totals.sales)}</div></div>
         <div class="card fee"><div class="l">OTA手数料</div><div class="v">−${yen(totals.fee)}</div></div>
         <div class="card profit"><div class="l">粗利益（売上−手数料）</div><div class="v">${yen(totals.profit)}</div></div>
         <div class="card"><div class="l">件数</div><div class="v">${totals.count}件</div></div>
       </div>`
    : `<div class="subhead">${esc(meta.title)}　／　${esc(meta.facilityName)}　／　${esc(meta.rangeLabel)}</div>`

  const body = pageRows.length > 0
    ? pageRows.map(rowHtml).join('')
    : '<tr><td colspan="8" style="text-align:center;color:#9ca3af;padding:24px;">該当する予約がありません</td></tr>'

  const tfoot = isLast
    ? `<tfoot><tr>
         <td colspan="5">合計（${totals.count}件）</td>
         <td class="r">${yen(totals.sales)}</td><td class="r">−${yen(totals.fee)}</td><td class="r">${yen(totals.profit)}</td>
       </tr></tfoot>`
    : ''

  return `<!doctype html><html lang="ja"><head><meta charset="utf-8">
<title>${esc(meta.fileName)}</title><style>${STYLES}</style></head><body>
  ${header}
  <table>${THEAD}<tbody>${body}</tbody>${tfoot}</table>
  ${isLast ? NOTE : ''}
  ${pageCount > 1 ? `<div class="pager">${pageIndex + 1} / ${pageCount}</div>` : ''}
</body></html>`
}

/**
 * 非表示のiframeを1つ用意して、HTMLの描画・高さ測定・画像化に使い回す。
 * アプリ側のCSSの影響を受けないよう、専用のドキュメントに隔離している。
 */
function createStage() {
  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.style.cssText = `position:fixed;left:-10000px;top:0;border:0;width:${PAGE_W}px;height:${PAGE_H}px;`
  document.body.appendChild(iframe)

  const write = async (html: string): Promise<Document> => {
    const doc = iframe.contentDocument
    if (!doc) throw new Error('PDFの描画領域を作成できませんでした')
    doc.open()
    doc.write(html)
    doc.close()
    // フォント読み込み待ち（未対応ブラウザでは待たずに進む）
    await doc.fonts?.ready?.catch(() => {})
    return doc
  }

  return {
    /** 描画した中身の高さ（ページに収まるかの判定に使う） */
    measure: async (html: string) => {
      const doc = await write(html)
      return Math.max(doc.body.scrollHeight, doc.documentElement.scrollHeight)
    },
    capture: async (html: string, html2canvas: typeof import('html2canvas').default) => {
      const doc = await write(html)
      return html2canvas(doc.body, {
        scale: 2,
        backgroundColor: '#ffffff',
        width: PAGE_W,
        height: PAGE_H,
        windowWidth: PAGE_W,
        windowHeight: PAGE_H,
        logging: false,
      })
    },
    dispose: () => iframe.remove(),
  }
}

/**
 * 実際の描画高さを見ながらページを区切る。
 * 最終ページは合計行と注記が加わるので、その状態で測って収まる分だけ載せる。
 */
async function paginate(
  rows: ReportRow[],
  meta: ReportMeta,
  totals: { sales: number; fee: number; profit: number; count: number },
  stage: ReturnType<typeof createStage>
): Promise<ReportRow[][]> {
  if (rows.length === 0) return [[]]

  const pages: ReportRow[][] = []
  let rest = rows

  while (rest.length > 0) {
    const isFirst = pages.length === 0
    let take = Math.min(rest.length, isFirst ? ROWS_FIRST_PAGE : ROWS_OTHER_PAGE)

    // 収まらなければ、はみ出した高さの分だけ行を減らして測り直す
    for (let guard = 0; guard < 10 && take > 1; guard++) {
      const html = pageHtml(rest.slice(0, take), meta, totals, pages.length, take === rest.length ? pages.length + 1 : pages.length + 2)
      const height = await stage.measure(html)
      if (height <= PAGE_H) break
      take = Math.max(1, take - Math.max(1, Math.ceil((height - PAGE_H) / APPROX_ROW_H)))
    }

    pages.push(rest.slice(0, take))
    rest = rest.slice(take)
  }

  return pages
}

/** レポートをPDFとしてその場でダウンロードする */
export async function downloadReportPdf(rows: ReportRow[], meta: ReportMeta): Promise<void> {
  const totals = {
    sales: rows.reduce((s, r) => s + r.sales, 0),
    fee: rows.reduce((s, r) => s + r.fee, 0),
    profit: rows.reduce((s, r) => s + r.profit, 0),
    count: rows.length,
  }

  // 出力時にだけ読み込む（通常の画面表示を重くしないため）
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ])

  const stage = createStage()
  try {
    const pages = await paginate(rows, meta, totals, stage)
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })

    for (let i = 0; i < pages.length; i++) {
      const canvas = await stage.capture(pageHtml(pages[i], meta, totals, i, pages.length), html2canvas)
      if (i > 0) pdf.addPage()
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, 210, 297)
    }

    pdf.save(`${meta.fileName}.pdf`)
  } finally {
    stage.dispose()
  }
}
