'use client'

import { useState, useMemo } from 'react'
import { Filter, ChevronDown, CalendarDays, CalendarRange, XCircle, TrendingUp, Download, FileText, Info, X } from 'lucide-react'
import { formatDate, formatYen as yen, jstDate } from '@/lib/utils'
import { ChannelBadge, channelLabel } from '@/components/dashboard/channel-badge'
import { OtaBadge } from '@/components/dashboard/ota-badge'

type Booking = {
  id: string
  guest_name: string | null
  checkin_date: string
  checkout_date: string
  num_guests: number
  ota_source: string | null
  ota_channel: string | null
  ota_status: string | null
  price: number | null
  commission: number | null
  facility_id: string
  facilities: { name: string } | null
}

type Facility = { id: string; name: string }


// 売上 / 手数料 / 粗利益 を1予約から算出
const salesOf = (b: Booking) => b.price ?? 0
const feeOf = (b: Booking) => b.commission ?? 0
const profitOf = (b: Booking) => (b.price ?? 0) - (b.commission ?? 0)

// デフォルト日付範囲：本日〜3ヶ月後（UTC基準だと深夜0〜9時に前日始まりになるためJSTで算出）
const defaultFrom = jstDate()
const defaultTo = jstDate(new Date(new Date().setMonth(new Date().getMonth() + 3)))

type StatusFilter = 'confirmed' | 'cancelled' | 'all'
type DateBasis = 'checkout' | 'checkin'

const STATUS_LABEL: Record<StatusFilter, string> = {
  confirmed: '予約済', cancelled: 'キャンセル', all: 'すべて',
}
const BASIS_LABEL: Record<DateBasis, string> = {
  checkout: 'チェックアウト日', checkin: 'チェックイン日',
}

const dateOfBy = (b: Booking, basis: DateBasis) => (basis === 'checkout' ? b.checkout_date : b.checkin_date)

// レポートの「OTA」欄はAirbnb・Booking.comなどの予約元を表示する
// （Beds24 / Airhost はサイトコントローラーであってOTAではない）
const otaLabelOf = (b: Booking) => channelLabel(b.ota_channel) ?? (b.ota_source ? '不明' : '手動')
const normStatus = (s: string | null) => (s === 'cancelled' ? 'cancelled' : 'confirmed')

// ファイル名に使えない文字を除去
const sanitizeName = (s: string) => s.replace(/[\\/:*?"<>|]/g, '').trim()

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string))

// PDFの中身を組み立てる（通常の出力・月次レポートで共用）
function buildReportHtml(opts: {
  rows: Booking[]
  title: string
  fileName: string
  facilityName: string
  statusLabel: string
  rangeLabel: string
}): string {
  const { rows, title, fileName, facilityName, statusLabel, rangeLabel } = opts
  const totalSales = rows.reduce((s, b) => s + salesOf(b), 0)
  const totalFee = rows.reduce((s, b) => s + feeOf(b), 0)
  const totalProfit = totalSales - totalFee
  const count = rows.length
  const today = new Date().toLocaleDateString('ja-JP')

  const rowsHtml = rows.map(b => `
      <tr class="${b.ota_status === 'cancelled' ? 'cancelled' : ''}">
        <td>${esc(b.facilities?.name ?? '—')}</td>
        <td class="ota">${esc(otaLabelOf(b))}</td>
        <td>${esc(formatDate(b.checkin_date))} 〜 ${esc(formatDate(b.checkout_date))}</td>
        <td>${esc(b.guest_name ?? '—')}</td>
        <td class="c">${esc(b.num_guests)}</td>
        <td class="r">${yen(salesOf(b))}</td>
        <td class="r fee">${feeOf(b) ? '−' + yen(feeOf(b)) : '—'}</td>
        <td class="r profit">${yen(profitOf(b))}</td>
      </tr>`).join('')

  return `<!doctype html><html lang="ja"><head><meta charset="utf-8">
<title>${esc(fileName)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Hiragino Sans','Helvetica Neue',Arial,sans-serif; color:#1f2937; margin:32px; font-size:12px; }
  .head { display:flex; justify-content:space-between; align-items:flex-end; border-bottom:2px solid #1e293b; padding-bottom:12px; margin-bottom:16px; }
  h1 { font-size:20px; margin:0; color:#1e293b; letter-spacing:.04em; }
  .brand { font-size:12px; color:#6366f1; font-weight:700; letter-spacing:.1em; margin-bottom:2px; }
  .meta { text-align:right; font-size:11px; color:#6b7280; line-height:1.7; }
  .cards { display:flex; gap:12px; margin-bottom:18px; }
  .card { flex:1; border:1px solid #e5e7eb; border-radius:10px; padding:12px 14px; }
  .card .l { font-size:10px; color:#6b7280; margin-bottom:4px; }
  .card .v { font-size:18px; font-weight:800; }
  .card.sales .v { color:#1e293b; } .card.fee .v { color:#b45309; } .card.profit { background:#eef2ff; border-color:#c7d2fe; } .card.profit .v { color:#4338ca; }
  table { width:100%; border-collapse:collapse; }
  th,td { padding:7px 8px; border-bottom:1px solid #e5e7eb; text-align:left; }
  th { background:#f8fafc; font-size:10px; color:#475569; text-transform:none; border-bottom:1.5px solid #cbd5e1; }
  td.r,th.r { text-align:right; white-space:nowrap; } td.c,th.c { text-align:center; }
  td.ota { color:#6b7280; } td.fee { color:#b45309; } td.profit { font-weight:700; color:#4338ca; }
  tr.cancelled td { color:#9ca3af; text-decoration:line-through; }
  tfoot td { font-weight:800; border-top:2px solid #1e293b; background:#f8fafc; }
  .note { margin-top:14px; font-size:10px; color:#6b7280; line-height:1.7; }
  @media print { body { margin:12mm; } }
</style></head><body>
  <div class="head">
    <div><div class="brand">GuestFollow</div><h1>${esc(title)}</h1></div>
    <div class="meta">
      出力日：${today}<br>施設：${esc(facilityName)}／ステータス：${esc(statusLabel)}<br>期間：${esc(rangeLabel)}
    </div>
  </div>
  <div class="cards">
    <div class="card sales"><div class="l">売上（総額）</div><div class="v">${yen(totalSales)}</div></div>
    <div class="card fee"><div class="l">OTA手数料</div><div class="v">−${yen(totalFee)}</div></div>
    <div class="card profit"><div class="l">粗利益（売上−手数料）</div><div class="v">${yen(totalProfit)}</div></div>
    <div class="card"><div class="l">件数</div><div class="v">${count}件</div></div>
  </div>
  <table>
    <thead><tr>
      <th>施設</th><th>OTA</th><th>チェックイン〜アウト</th><th>予約名</th><th class="c">人数</th>
      <th class="r">売上</th><th class="r">OTA手数料</th><th class="r">粗利益</th>
    </tr></thead>
    <tbody>${rowsHtml || '<tr><td colspan="8" style="text-align:center;color:#9ca3af;padding:24px;">該当する予約がありません</td></tr>'}</tbody>
    <tfoot><tr>
      <td colspan="5">合計（${count}件）</td>
      <td class="r">${yen(totalSales)}</td><td class="r">−${yen(totalFee)}</td><td class="r">${yen(totalProfit)}</td>
    </tr></tfoot>
  </table>
  <div class="note">
    ※ 売上＝OTA予約の総額。OTA手数料＝サイトコントローラー（Beds24）から取得した手数料の実額。粗利益＝売上−OTA手数料。<br>
    ※ 実際の入金額・振込タイミングはOTAにより異なります（Airbnbは粗利益が入金、Booking.comは売上が入金され後日手数料を支払い）。
  </div>
  <script>window.onload=function(){window.print();}</script>
</body></html>`
}

// 別ウィンドウで開いて印刷ダイアログ（PDF保存）を出す
function printHtml(html: string) {
  const w = window.open('', '_blank')
  if (!w) { alert('ポップアップがブロックされました。ブラウザのポップアップを許可してください。'); return }
  w.document.open()
  w.document.write(html)
  w.document.close()
}

export function ReportsClient({ bookings, facilities }: { bookings: Booking[]; facilities: Facility[] }) {
  const [facilityFilter, setFacilityFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState(defaultFrom)
  const [dateTo, setDateTo] = useState(defaultTo)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [dateBasis, setDateBasis] = useState<DateBasis>('checkout') // 日付フィルタの基準
  const [showInfo, setShowInfo] = useState(false) // 入金の違いポップアップ
  const [showMonth, setShowMonth] = useState(false) // 「月で選択」ポップオーバー

  // 月次レポート出力（施設×月の一覧から1クリックでPDF）
  // 一覧側の絞り込みとは独立させ、既定値は一覧と同じ「すべて」「チェックアウト日で絞込」
  const [showMonthly, setShowMonthly] = useState(false)
  const [monthlyStatus, setMonthlyStatus] = useState<StatusFilter>('all')
  const [monthlyBasis, setMonthlyBasis] = useState<DateBasis>('checkout')

  // 「YYYY-MM」を受け取り、その月の1日〜末日を日付範囲に設定する
  const applyMonth = (month: string) => {
    if (!month) return
    const [y, m] = month.split('-').map(Number)
    if (!y || !m) return
    const lastDay = new Date(y, m, 0).getDate() // m は1始まり → その月の末日
    const mm = String(m).padStart(2, '0')
    setDateFrom(`${y}-${mm}-01`)
    setDateTo(`${y}-${mm}-${String(lastDay).padStart(2, '0')}`)
    setShowMonth(false)
  }

  const filtered = useMemo(() => {
    const dateOf = (b: Booking) => dateOfBy(b, dateBasis)
    let list = [...bookings]
    if (facilityFilter !== 'all') list = list.filter(b => b.facility_id === facilityFilter)
    if (dateFrom) list = list.filter(b => dateOf(b) >= dateFrom)
    if (dateTo) list = list.filter(b => dateOf(b) <= dateTo)

    if (statusFilter !== 'all') list = list.filter(b => normStatus(b.ota_status) === statusFilter)

    // フィルタ基準日の昇順（直近の予約が上）
    list.sort((a, b) => (dateOf(a) > dateOf(b) ? 1 : -1))
    return list
  }, [bookings, facilityFilter, dateFrom, dateTo, statusFilter, dateBasis])

  const totalSales = filtered.reduce((s, b) => s + salesOf(b), 0)
  const totalFee = filtered.reduce((s, b) => s + feeOf(b), 0)
  const totalProfit = totalSales - totalFee
  const count = filtered.length

  // 絞り込み条件の見出し（CSV/PDFの副題に使用）
  const facilityName = facilityFilter === 'all' ? 'すべての施設' : (facilities.find(f => f.id === facilityFilter)?.name ?? '施設')
  const statusLabel = STATUS_LABEL[statusFilter]
  const basisLabel = BASIS_LABEL[dateBasis]
  const rangeLabel = `${dateFrom || '—'} 〜 ${dateTo || '—'}（${basisLabel}基準）`

  // エクスポート用ファイル名：売上_<施設名>_YYYYMM（YYYYMMはフィルタ範囲の終了日から）
  const lastDate =
    dateTo ||
    (filtered.length
      ? filtered.reduce((mx, b) => {
          const d = dateBasis === 'checkout' ? b.checkout_date : b.checkin_date
          return d > mx ? d : mx
        }, '')
      : '') ||
    jstDate()
  const yyyymm = lastDate.slice(0, 7).replace('-', '')
  const facLabel = facilityFilter === 'all' ? '全施設' : (facilities.find(f => f.id === facilityFilter)?.name ?? '施設')
  const exportBaseName = `売上_${sanitizeName(facLabel)}_${yyyymm}`

  const handleCsv = () => {
    // 「OTA」は予約元（Airbnb等）。サイトコントローラーは「連携元」として別列に残す
    const headers = ['OTA', '連携元', 'チェックイン日', 'チェックアウト日', '予約名', '人数', '売上', 'OTA手数料', '粗利益', 'ステータス', '施設']
    const rows = filtered.map(b => [
      otaLabelOf(b),
      b.ota_source ?? '手動',
      b.checkin_date,
      b.checkout_date,
      b.guest_name ?? '',
      b.num_guests,
      salesOf(b),
      feeOf(b),
      profitOf(b),
      b.ota_status === 'cancelled' ? 'キャンセル' : '予約済',
      b.facilities?.name ?? '',
    ].map(v => `"${String(v).replace(/"/g, '""')}"`))
    // 合計行
    rows.push(['合計', '', '', '', '', String(count), String(totalSales), String(totalFee), String(totalProfit), '', '']
      .map(v => `"${v}"`))
    const bom = '﻿'
    const csv = bom + [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${exportBaseName}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── 月次レポート：施設×月のマトリクス ───────────────────────────────
  // 予約が存在する月だけを新しい順に並べる（基準日はモーダル側の選択に従う）
  const monthlyMatrix = useMemo(() => {
    const rows = monthlyStatus === 'all'
      ? bookings
      : bookings.filter(b => normStatus(b.ota_status) === monthlyStatus)

    // "YYYY-MM" → 施設ID → { 件数, 売上 }
    const byMonth = new Map<string, Map<string, { count: number; sales: number }>>()
    for (const b of rows) {
      const ym = dateOfBy(b, monthlyBasis).slice(0, 7)
      if (!ym) continue
      const perFacility = byMonth.get(ym) ?? new Map()
      const cur = perFacility.get(b.facility_id) ?? { count: 0, sales: 0 }
      cur.count++
      cur.sales += salesOf(b)
      perFacility.set(b.facility_id, cur)
      byMonth.set(ym, perFacility)
    }

    return [...byMonth.entries()]
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))   // 新しい月が上
      .map(([ym, perFacility]) => ({
        ym,
        perFacility,
        total: [...perFacility.values()].reduce(
          (acc, v) => ({ count: acc.count + v.count, sales: acc.sales + v.sales }),
          { count: 0, sales: 0 }
        ),
      }))
  }, [bookings, monthlyStatus, monthlyBasis])

  // 指定の月・施設（null なら全施設）でPDFを出力する
  const outputMonthly = (ym: string, facilityId: string | null) => {
    const [y, m] = ym.split('-').map(Number)
    const lastDay = new Date(y, m, 0).getDate()
    const from = `${ym}-01`
    const to = `${ym}-${String(lastDay).padStart(2, '0')}`

    const rows = bookings
      .filter(b => !facilityId || b.facility_id === facilityId)
      .filter(b => {
        const d = dateOfBy(b, monthlyBasis)
        return d >= from && d <= to
      })
      .filter(b => monthlyStatus === 'all' || normStatus(b.ota_status) === monthlyStatus)
      .sort((a, b) => (dateOfBy(a, monthlyBasis) > dateOfBy(b, monthlyBasis) ? 1 : -1))

    const facName = facilityId
      ? (facilities.find(f => f.id === facilityId)?.name ?? '施設')
      : '全施設'

    printHtml(buildReportHtml({
      rows,
      title: `月次売上レポート（${y}年${m}月）`,
      fileName: `売上_${sanitizeName(facName)}_${ym.replace('-', '')}`,
      facilityName: facilityId ? facName : 'すべての施設',
      statusLabel: STATUS_LABEL[monthlyStatus],
      rangeLabel: `${from} 〜 ${to}（${BASIS_LABEL[monthlyBasis]}基準）`,
    }))
  }

  const handlePdf = () => {
    printHtml(buildReportHtml({
      rows: filtered,
      title: '売上レポート',
      fileName: exportBaseName,
      facilityName,
      statusLabel,
      rangeLabel,
    }))
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">売上レポート</h2>
          <p className="text-gray-400 text-sm mt-0.5">施設・時期・予約ステータスで絞り込み</p>
        </div>
        <button
          onClick={() => setShowMonthly(true)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-white bg-navy-600 border border-navy-600 rounded-lg px-4 py-2 hover:bg-navy-700 transition-colors"
        >
          <CalendarRange size={16} /> 月次レポート出力
        </button>
      </div>

      {/* サマリー：売上 / OTA手数料 / 粗利益 / 件数 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="flex items-center gap-3 p-4 rounded-xl border bg-gray-50 border-gray-200 text-gray-700">
          <TrendingUp size={22} className="shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-medium opacity-80">売上（総額）</p>
            <p className="text-xl sm:text-2xl font-black truncate">{yen(totalSales)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 rounded-xl border bg-amber-50 border-amber-200 text-amber-700">
          <XCircle size={22} className="shrink-0" />
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <p className="text-xs font-medium opacity-80">OTA手数料</p>
              <button onClick={() => setShowInfo(true)} className="opacity-70 hover:opacity-100" aria-label="入金の違いを表示">
                <Info size={13} />
              </button>
            </div>
            <p className="text-xl sm:text-2xl font-black truncate">−{yen(totalFee)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 rounded-xl border bg-navy-50 border-navy-200 text-navy-700">
          <TrendingUp size={22} className="shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-medium opacity-80">粗利益（売上−手数料）</p>
            <p className="text-xl sm:text-2xl font-black truncate">{yen(totalProfit)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 rounded-xl border bg-gray-50 border-gray-200 text-gray-700">
          <CalendarDays size={22} className="shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-medium opacity-80">件数</p>
            <p className="text-xl sm:text-2xl font-black">{count}<span className="text-base font-bold ml-1">件</span></p>
          </div>
        </div>
      </div>

      {/* フィルターバー */}
      <div className="bg-white border border-gray-200 rounded-xl p-3 flex flex-wrap gap-2 items-center">
        <Filter size={14} className="text-gray-400 shrink-0" />

        {/* 施設 */}
        <div className="relative">
          <select
            value={facilityFilter}
            onChange={e => setFacilityFilter(e.target.value)}
            className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg pl-3 pr-7 py-1.5 appearance-none focus:outline-none focus:ring-2 focus:ring-navy-300 cursor-pointer"
          >
            <option value="all">すべての施設</option>
            {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>

        {/* ステータス */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as StatusFilter)}
            className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg pl-3 pr-7 py-1.5 appearance-none focus:outline-none focus:ring-2 focus:ring-navy-300 cursor-pointer"
          >
            <option value="confirmed">予約済</option>
            <option value="cancelled">キャンセル</option>
            <option value="all">すべて</option>
          </select>
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>

        {/* 日付フィルタの基準（チェックイン / チェックアウト） */}
        <div className="relative">
          <select
            value={dateBasis}
            onChange={e => setDateBasis(e.target.value as 'checkout' | 'checkin')}
            className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg pl-3 pr-7 py-1.5 appearance-none focus:outline-none focus:ring-2 focus:ring-navy-300 cursor-pointer"
            aria-label="日付フィルタの基準"
          >
            <option value="checkout">チェックアウト日で絞込</option>
            <option value="checkin">チェックイン日で絞込</option>
          </select>
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>

        {/* 日付範囲 */}
        <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1">
          <CalendarDays size={13} className="text-gray-400 shrink-0" />
          <input type="date" value={dateFrom} max={dateTo || undefined} onChange={e => setDateFrom(e.target.value)}
            aria-label={`${dateBasis === 'checkout' ? 'チェックアウト' : 'チェックイン'}日（開始）`} className="text-sm text-gray-700 bg-transparent focus:outline-none w-[7.5rem]" />
          <span className="text-gray-400 text-xs">〜</span>
          <input type="date" value={dateTo} min={dateFrom || undefined} onChange={e => setDateTo(e.target.value)}
            aria-label={`${dateBasis === 'checkout' ? 'チェックアウト' : 'チェックイン'}日（終了）`} className="text-sm text-gray-700 bg-transparent focus:outline-none w-[7.5rem]" />
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(''); setDateTo('') }} className="text-gray-400 hover:text-gray-600 shrink-0" aria-label="日付範囲をクリア">
              <XCircle size={14} />
            </button>
          )}
        </div>

        {/* 月で選択 */}
        <div className="relative">
          <button
            onClick={() => setShowMonth(v => !v)}
            className="inline-flex items-center gap-1.5 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-100 transition-colors"
          >
            <CalendarDays size={13} className="text-gray-400" /> 月で選択
            <ChevronDown size={12} className="text-gray-400" />
          </button>
          {showMonth && (
            <>
              {/* クリック外で閉じる */}
              <div className="fixed inset-0 z-10" onClick={() => setShowMonth(false)} />
              <div className="absolute z-20 mt-1 left-0 bg-white border border-gray-200 rounded-xl shadow-lg p-3 w-64">
                <p className="text-xs font-medium text-gray-600 mb-2">対象の月を選択</p>
                <input
                  type="month"
                  defaultValue={(dateTo || dateFrom || jstDate()).slice(0, 7)}
                  onChange={e => applyMonth(e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-300"
                  aria-label="対象の月"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {(() => {
                    const now = new Date()
                    const mk = (offset: number) => {
                      const d = new Date(now.getFullYear(), now.getMonth() + offset, 1)
                      return { label: `${d.getFullYear()}年${d.getMonth() + 1}月`, value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }
                    }
                    return [mk(0), mk(-1), mk(-2)].map(({ label, value }) => (
                      <button
                        key={value}
                        onClick={() => applyMonth(value)}
                        className="text-xs text-navy-700 bg-navy-50 border border-navy-200 rounded-lg px-2 py-1 hover:bg-navy-100"
                      >
                        {label}
                      </button>
                    ))
                  })()}
                </div>
              </div>
            </>
          )}
        </div>

        {/* 表示中のデータの出力（絞り込み条件の右） */}
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={handleCsv}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors"
          >
            <Download size={15} /> CSV出力
          </button>
          <button
            onClick={handlePdf}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors"
          >
            <FileText size={15} /> PDF出力
          </button>
        </div>
      </div>

      {/* 一覧 */}
      {filtered.length > 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            {/* ヘッダー（デスクトップ） */}
            <div className="hidden lg:grid grid-cols-[1.1fr_1.3fr_1.2fr_0.5fr_1fr_1fr_1fr] gap-4 px-5 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[900px]">
              <div>施設 / OTA</div>
              <div>チェックイン 〜 アウト</div>
              <div>予約名</div>
              <div className="text-center">人数</div>
              <div className="text-right">売上</div>
              <div className="text-right">OTA手数料</div>
              <div className="text-right">粗利益</div>
            </div>

            <div className="divide-y divide-gray-200 lg:min-w-[900px]">
              {filtered.map((b, idx) => {
                const cancelled = b.ota_status === 'cancelled'
                return (
                  <div
                    key={b.id}
                    className={`grid grid-cols-1 lg:grid-cols-[1.1fr_1.3fr_1.2fr_0.5fr_1fr_1fr_1fr] gap-x-4 gap-y-1 px-5 py-3 items-center ${
                      idx % 2 === 1 ? 'bg-gray-50/60' : 'bg-white'
                    } ${cancelled ? 'opacity-60' : ''}`}
                  >
                    {/* 施設 / OTA */}
                    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                      <span className="text-sm font-semibold text-gray-900 truncate">{b.facilities?.name ?? '—'}</span>
                      <ChannelBadge channel={b.ota_channel} />
                      <OtaBadge source={b.ota_source} />
                      {cancelled && <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 rounded px-1.5 py-0.5">キャンセル</span>}
                    </div>

                    {/* 日程 */}
                    <div className="text-sm text-gray-700 whitespace-nowrap">
                      <span className="font-medium">{formatDate(b.checkin_date)}</span>
                      <span className="text-gray-400"> 〜 {formatDate(b.checkout_date)}</span>
                    </div>

                    {/* 予約名 */}
                    <div className="text-sm text-gray-700 truncate">
                      {b.guest_name ?? <span className="text-gray-300">—</span>}
                    </div>

                    {/* 人数 */}
                    <div className="text-sm text-gray-500 lg:text-center">
                      <span className="lg:hidden text-xs text-gray-400 mr-1">人数:</span>{b.num_guests}名
                    </div>

                    {/* 売上 */}
                    <div className={`text-sm font-semibold lg:text-right ${cancelled ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                      <span className="lg:hidden text-xs text-gray-400 mr-1 font-normal">売上:</span>
                      {b.price ? yen(salesOf(b)) : <span className="text-gray-300 font-normal">—</span>}
                    </div>

                    {/* OTA手数料 */}
                    <div className={`text-sm lg:text-right ${cancelled ? 'text-gray-400 line-through' : 'text-amber-700'}`}>
                      <span className="lg:hidden text-xs text-gray-400 mr-1">OTA手数料:</span>
                      {feeOf(b) ? `−${yen(feeOf(b))}` : <span className="text-gray-300">—</span>}
                    </div>

                    {/* 粗利益 */}
                    <div className={`text-sm font-bold lg:text-right ${cancelled ? 'text-gray-400 line-through' : 'text-navy-700'}`}>
                      <span className="lg:hidden text-xs text-gray-400 mr-1 font-normal">粗利益:</span>
                      {b.price ? yen(profitOf(b)) : <span className="text-gray-300 font-normal">—</span>}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* 合計フッター */}
            <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1.3fr_1.2fr_0.5fr_1fr_1fr_1fr] gap-4 px-5 py-3 bg-navy-50 border-t border-navy-200 lg:min-w-[900px] items-center">
              <span className="text-sm font-semibold text-navy-700 lg:col-span-4">合計（{count}件）</span>
              <span className="text-sm font-black text-gray-900 lg:text-right">
                <span className="lg:hidden text-xs text-navy-700 mr-1 font-normal">売上:</span>{yen(totalSales)}
              </span>
              <span className="text-sm font-bold text-amber-700 lg:text-right">
                <span className="lg:hidden text-xs text-navy-700 mr-1 font-normal">手数料:</span>−{yen(totalFee)}
              </span>
              <span className="text-base font-black text-navy-700 lg:text-right">
                <span className="lg:hidden text-xs mr-1 font-normal">粗利益:</span>{yen(totalProfit)}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl text-center py-16 text-gray-400">
          <TrendingUp size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">該当する予約がありません</p>
          <p className="text-xs mt-1">フィルターを変更するか、予約一覧の「予約を同期」で金額を反映してください</p>
        </div>
      )}

      <p className="text-xs text-gray-400 leading-relaxed">
        ※ 売上＝サイトコントローラー（Beds24 / Airhost）から同期したOTA予約の総額。OTA手数料＝Beds24が取得した手数料の実額（手動予約・Airhostは0）。粗利益＝売上−OTA手数料。反映には予約一覧の「予約を同期」を実行してください。
      </p>

      {/* 月次レポート出力 */}
      {showMonthly && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-y-auto"
          onClick={() => setShowMonthly(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-4xl my-8"
            onClick={e => e.stopPropagation()}
          >
            {/* ヘッダー */}
            <div className="flex items-start justify-between gap-3 px-6 pt-6 pb-4">
              <div className="flex items-center gap-2">
                <CalendarRange size={20} className="text-navy-600 shrink-0" />
                <div>
                  <h3 className="text-lg font-bold text-gray-900">月次レポート出力</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    出力したい月と施設のマスをクリックするとPDFが開きます（印刷画面から「PDFに保存」）
                  </p>
                </div>
              </div>
              <button onClick={() => setShowMonthly(false)} className="text-gray-400 hover:text-gray-600" aria-label="閉じる">
                <X size={20} />
              </button>
            </div>

            {/* 出力条件 */}
            <div className="px-6 pb-4 flex flex-wrap items-center gap-2 border-b border-gray-100">
              <Filter size={14} className="text-gray-400 shrink-0" />
              <div className="relative">
                <select
                  value={monthlyStatus}
                  onChange={e => setMonthlyStatus(e.target.value as StatusFilter)}
                  className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg pl-3 pr-7 py-1.5 appearance-none focus:outline-none focus:ring-2 focus:ring-navy-300 cursor-pointer"
                  aria-label="出力するステータス"
                >
                  <option value="confirmed">予約済</option>
                  <option value="cancelled">キャンセル</option>
                  <option value="all">すべて</option>
                </select>
                <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
              <div className="relative">
                <select
                  value={monthlyBasis}
                  onChange={e => setMonthlyBasis(e.target.value as DateBasis)}
                  className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg pl-3 pr-7 py-1.5 appearance-none focus:outline-none focus:ring-2 focus:ring-navy-300 cursor-pointer"
                  aria-label="月の判定に使う日付"
                >
                  <option value="checkout">チェックアウト日で絞込</option>
                  <option value="checkin">チェックイン日で絞込</option>
                </select>
                <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
              <span className="text-xs text-gray-400">
                （{BASIS_LABEL[monthlyBasis]}がその月に含まれる予約を集計します）
              </span>
            </div>

            {/* 施設×月のマトリクス */}
            {monthlyMatrix.length > 0 ? (
              <div className="px-6 py-4">
                <div className="overflow-auto max-h-[60vh] border border-gray-200 rounded-xl">
                  <table className="w-full text-sm border-collapse">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-gray-50">
                        <th className="text-left text-xs font-semibold text-gray-500 px-3 py-2 border-b border-gray-200 sticky left-0 bg-gray-50 z-20 whitespace-nowrap">
                          月
                        </th>
                        {facilities.map(f => (
                          <th key={f.id} className="text-right text-xs font-semibold text-gray-500 px-3 py-2 border-b border-gray-200 whitespace-nowrap">
                            {f.name}
                          </th>
                        ))}
                        <th className="text-right text-xs font-semibold text-navy-700 px-3 py-2 border-b border-gray-200 bg-navy-50 whitespace-nowrap">
                          全施設
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyMatrix.map(({ ym, perFacility, total }) => {
                        const [y, m] = ym.split('-')
                        return (
                          <tr key={ym} className="hover:bg-gray-50/60">
                            <td className="px-3 py-2 border-b border-gray-100 font-medium text-gray-800 sticky left-0 bg-white whitespace-nowrap">
                              {Number(y)}年{Number(m)}月
                            </td>
                            {facilities.map(f => {
                              const cell = perFacility.get(f.id)
                              return (
                                <td key={f.id} className="px-1.5 py-1.5 border-b border-gray-100 text-right">
                                  {cell ? (
                                    <button
                                      onClick={() => outputMonthly(ym, f.id)}
                                      className="w-full rounded-lg px-2 py-1.5 hover:bg-navy-50 border border-transparent hover:border-navy-200 transition-colors group"
                                      title={`${Number(y)}年${Number(m)}月 ／ ${f.name} のレポートを出力`}
                                    >
                                      <span className="block text-sm font-semibold text-gray-900 group-hover:text-navy-700 whitespace-nowrap">
                                        {yen(cell.sales)}
                                      </span>
                                      <span className="block text-[10px] text-gray-400">{cell.count}件</span>
                                    </button>
                                  ) : (
                                    <span className="block text-gray-300 px-2 py-1.5">—</span>
                                  )}
                                </td>
                              )
                            })}
                            <td className="px-1.5 py-1.5 border-b border-gray-100 text-right bg-navy-50/40">
                              <button
                                onClick={() => outputMonthly(ym, null)}
                                className="w-full rounded-lg px-2 py-1.5 hover:bg-navy-100 border border-transparent hover:border-navy-300 transition-colors group"
                                title={`${Number(y)}年${Number(m)}月 ／ 全施設のレポートを出力`}
                              >
                                <span className="block text-sm font-bold text-navy-700 whitespace-nowrap">
                                  {yen(total.sales)}
                                </span>
                                <span className="block text-[10px] text-navy-500">{total.count}件</span>
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-gray-400 mt-3 leading-relaxed">
                  ※ 金額は各マスの売上（総額）です。予約がある月のみ表示しています。「—」の月・施設は対象の予約がありません。
                </p>
              </div>
            ) : (
              <div className="px-6 py-12 text-center text-gray-400">
                <CalendarRange size={40} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">対象の予約がありません</p>
                <p className="text-xs mt-1">ステータスの条件を変えるか、予約一覧の「予約を同期」で金額を反映してください</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 入金の違いポップアップ */}
      {showInfo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowInfo(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <Info size={20} className="text-navy-600 shrink-0" />
                <h3 className="text-lg font-bold text-gray-900">売上・手数料・入金の関係</h3>
              </div>
              <button onClick={() => setShowInfo(false)} className="text-gray-400 hover:text-gray-600" aria-label="閉じる">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-gray-50 border border-gray-200 p-2">
                  <p className="text-[11px] text-gray-500">売上</p>
                  <p className="font-bold">総額</p>
                </div>
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-2">
                  <p className="text-[11px] text-amber-600">− OTA手数料</p>
                  <p className="font-bold text-amber-700">手数料</p>
                </div>
                <div className="rounded-lg bg-navy-50 border border-navy-200 p-2">
                  <p className="text-[11px] text-navy-600">= 粗利益</p>
                  <p className="font-bold text-navy-700">手取り</p>
                </div>
              </div>

              <p className="font-semibold text-gray-900 pt-1">入金のされ方はOTAで異なります</p>
              <ul className="space-y-2">
                <li className="flex gap-2">
                  <span className="text-[10px] font-bold text-pink-600 bg-pink-50 border border-pink-200 rounded px-1.5 py-0.5 h-fit mt-0.5 shrink-0">Airbnb</span>
                  <span>
                    手数料が差し引かれた <span className="font-semibold text-navy-700">粗利益（手取り）がそのまま入金</span>されます。
                    レポートの「粗利益」に近い額が振り込まれます。
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5 h-fit mt-0.5 shrink-0">Booking.com</span>
                  <span>
                    まず <span className="font-semibold">売上（総額）が入金</span>され、
                    <span className="font-semibold text-amber-700">後日OTA手数料を別途支払う</span>形になります。
                    そのため入金時点では手数料が引かれておらず、あとで手数料分の支出が発生します。
                  </span>
                </li>
              </ul>

              <p className="text-xs text-gray-400 pt-1">
                ※ 実際の入金額・タイミングは各OTA・ご契約内容により異なります。本レポートの金額はBeds24から取得した値に基づく目安です。
              </p>
            </div>

            <button
              onClick={() => setShowInfo(false)}
              className="w-full mt-2 bg-navy-600 hover:bg-navy-700 text-white font-medium rounded-lg py-2.5 transition-colors"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
