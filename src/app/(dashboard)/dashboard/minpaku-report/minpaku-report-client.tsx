'use client'

import { Fragment, useMemo, useState } from 'react'
import { ChevronDown, CalendarDays, Download, FileText, Info, X, ClipboardCheck } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { countryNameJa, isJapan } from '@/lib/geo/country-names'

type Facility = { id: string; name: string }
type Booking = {
  id: string
  facility_id: string
  guest_name: string | null
  checkin_date: string
  checkout_date: string
  num_guests: number
  ota_status: string | null
  ota_channel: string | null
  guest_country: string | null
}

type BookingDetail = {
  id: string
  guestName: string | null
  channel: string | null
  checkin: string
  checkout: string
  guests: number
  nightsInPeriod: number
  guestNights: number
  nat: string
}
type GuestRecord = { booking_id: string; nationality: string | null; is_foreign: boolean | null }

// ── 日付ユーティリティ（UTC基準で日番号に変換） ──
const dayNum = (s: string) => Math.floor(Date.parse(`${s}T00:00:00Z`) / 86400000)
const lastDayOfMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate() // m:1始まり
const pad = (n: number) => String(n).padStart(2, '0')

type Period = { id: string; label: string; start: string; end: string; deadline: string }

// 隔月の報告期間を生成（開始月: 2,4,6,8,10,12 / 12月は翌1月末まで）
function generatePeriods(): Period[] {
  const now = new Date()
  const thisYear = now.getUTCFullYear()
  const list: Period[] = []
  for (let y = thisYear - 2; y <= thisYear + 1; y++) {
    for (const m of [2, 4, 6, 8, 10, 12]) {
      const startY = y, startM = m
      const endY = m === 12 ? y + 1 : y
      const endM = m === 12 ? 1 : m + 1
      const endDay = lastDayOfMonth(endY, endM)
      // 提出期限：期間終了の翌月15日
      const dlY = m === 12 ? y + 1 : (m === 10 ? y : y)
      const dlM = m === 12 ? 2 : m + 2
      const start = `${startY}-${pad(startM)}-01`
      const end = `${endY}-${pad(endM)}-${pad(endDay)}`
      const deadline = `${dlY}/${dlM}/15`
      list.push({
        id: start,
        label: `${startY}年${startM}月1日 〜 ${endY}年${endM}月${endDay}日`,
        start, end, deadline,
      })
    }
  }
  // 新しい順
  return list.sort((a, b) => (a.start < b.start ? 1 : -1))
}

// 既定は「直近で終了済みの期間」
function defaultPeriodId(periods: Period[]): string {
  const today = new Date().toISOString().split('T')[0]
  const done = periods.find(p => p.end < today)
  return (done ?? periods[periods.length - 1] ?? periods[0])?.id ?? ''
}

type FacilityAgg = {
  facility: Facility
  nights: number          // 宿泊日数（延べ宿泊日数：予約ごとの泊数合計・空室日は含まない実稼働）
  distinctNights: number  // 宿泊日数（届出住宅を稼働させた実日数：重複日は1日）
  guests: number          // 宿泊者数（実人数）
  guestNights: number     // 延べ宿泊者数（人泊）
  byNat: Record<string, number> // 国籍別 延べ宿泊者数
  details: BookingDetail[]      // 期間内の宿泊明細
}

export function MinpakuReportClient({
  facilities, bookings, guestRecords,
}: { facilities: Facility[]; bookings: Booking[]; guestRecords: GuestRecord[] }) {
  const periods = useMemo(() => generatePeriods(), [])
  const [periodId, setPeriodId] = useState(() => defaultPeriodId(periods))
  const [showInfo, setShowInfo] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set()) // 展開中の施設ID
  const toggleExpand = (id: string) =>
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const period = periods.find(p => p.id === periodId) ?? periods[0]

  // 予約 → 国籍バケツ
  //   優先順位：電子宿泊者名簿(guest_records) ＞ OTAのゲスト国コード(guest_country) ＞ 未登録
  const natOf = useMemo(() => {
    const m = new Map<string, GuestRecord>()
    for (const g of guestRecords) if (!m.has(g.booking_id)) m.set(g.booking_id, g)
    return (b: Booking): string => {
      const rec = m.get(b.id)
      if (rec && (rec.is_foreign || rec.nationality?.trim())) {
        if (rec.is_foreign) return (rec.nationality?.trim() || '外国（国籍不明）')
        return '日本'
      }
      // 名簿が無い/国籍未入力なら OTA の国コードを使う
      const cc = b.guest_country?.trim()
      if (cc) return isJapan(cc) ? '日本' : countryNameJa(cc)
      return '未登録'
    }
  }, [guestRecords])

  const { rows, totals } = useMemo(() => {
    const pStart = dayNum(period.start)
    const pEnd = dayNum(period.end) // 最終泊（含む）
    const map = new Map<string, FacilityAgg>()
    for (const f of facilities) {
      map.set(f.id, { facility: f, nights: 0, distinctNights: 0, guests: 0, guestNights: 0, byNat: {}, details: [] })
    }
    const distinctSet = new Map<string, Set<number>>() // facility_id → 稼働日集合

    for (const b of bookings) {
      if (b.ota_status === 'cancelled') continue
      const agg = map.get(b.facility_id)
      if (!agg) continue
      const ci = dayNum(b.checkin_date)
      const co = dayNum(b.checkout_date) // チェックアウト日は泊まらない
      const from = Math.max(ci, pStart)
      const to = Math.min(co - 1, pEnd) // 最終泊 = checkout-1
      const nights = to - from + 1
      if (nights <= 0) continue

      const g = b.num_guests || 1
      agg.nights += nights
      agg.guests += g
      agg.guestNights += g * nights
      const nat = natOf(b)
      agg.byNat[nat] = (agg.byNat[nat] ?? 0) + g * nights
      agg.details.push({
        id: b.id, guestName: b.guest_name, channel: b.ota_channel,
        checkin: b.checkin_date, checkout: b.checkout_date,
        guests: g, nightsInPeriod: nights, guestNights: g * nights, nat,
      })

      let set = distinctSet.get(b.facility_id)
      if (!set) { set = new Set(); distinctSet.set(b.facility_id, set) }
      for (let d = from; d <= to; d++) set.add(d)
    }

    for (const [fid, set] of distinctSet) {
      const agg = map.get(fid)
      if (agg) agg.distinctNights = set.size
    }

    const rows = [...map.values()].filter(a => a.guestNights > 0 || a.distinctNights > 0)
    for (const r of rows) r.details.sort((a, b) => (a.checkin > b.checkin ? 1 : -1))
    const totals = rows.reduce(
      (t, r) => {
        t.distinctNights += r.distinctNights
        t.guests += r.guests
        t.guestNights += r.guestNights
        return t
      },
      { distinctNights: 0, guests: 0, guestNights: 0 }
    )
    return { rows, totals }
  }, [facilities, bookings, period, natOf])

  // 全施設で登場する外国国籍の一覧（日本・未登録を除く）
  const foreignNats = useMemo(() => {
    const s = new Set<string>()
    for (const r of rows) for (const k of Object.keys(r.byNat)) if (k !== '日本' && k !== '未登録') s.add(k)
    return [...s].sort()
  }, [rows])

  const jpOf = (r: FacilityAgg) => r.byNat['日本'] ?? 0
  const unknownOf = (r: FacilityAgg) => r.byNat['未登録'] ?? 0
  const foreignOf = (r: FacilityAgg) => r.guestNights - jpOf(r) - unknownOf(r)

  const periodTag = period.start.replace(/-/g, '').slice(0, 6)
  const baseName = `宿泊実績報告_${periodTag}`

  const handleCsv = () => {
    const head = ['施設名', '届出番号', '宿泊日数(実稼働日)', '宿泊者数', '延べ宿泊者数', '日本人(延べ)', '外国人(延べ)', '国籍未登録(延べ)', ...foreignNats.map(n => `${n}(延べ)`)]
    const lines = rows.map(r => [
      r.facility.name, '', r.distinctNights, r.guests, r.guestNights, jpOf(r), foreignOf(r), unknownOf(r),
      ...foreignNats.map(n => r.byNat[n] ?? 0),
    ])
    const bom = '﻿'
    const meta = [
      `対象期間,${period.start} 〜 ${period.end}`,
      `提出期限,${period.deadline}`,
      '', // 空行
    ]
    const esc = (v: unknown) => `"${String(v).replace(/"/g, '""')}"`
    const csv = bom + [
      ...meta.map(m => m.split(',').map(esc).join(',')),
      head.map(esc).join(','),
      ...lines.map(l => l.map(esc).join(',')),
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${baseName}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handlePdf = () => {
    const esc = (s: unknown) =>
      String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string))
    const today = new Date().toLocaleDateString('ja-JP')
    const rowsHtml = rows.map(r => `
      <tr>
        <td>${esc(r.facility.name)}</td>
        <td class="c">${r.distinctNights}</td>
        <td class="c">${r.guests}</td>
        <td class="c b">${r.guestNights}</td>
        <td class="c">${jpOf(r)}</td>
        <td class="c">${foreignOf(r)}</td>
        <td class="c muted">${unknownOf(r)}</td>
      </tr>`).join('')
    const html = `<!doctype html><html lang="ja"><head><meta charset="utf-8">
<title>${esc(baseName)}</title>
<style>
  *{box-sizing:border-box} body{font-family:'Hiragino Sans','Helvetica Neue',Arial,sans-serif;color:#1f2937;margin:32px;font-size:12px}
  .head{border-bottom:2px solid #1e293b;padding-bottom:12px;margin-bottom:16px}
  h1{font-size:18px;margin:0 0 2px;color:#1e293b}
  .brand{font-size:11px;color:#6366f1;font-weight:700;letter-spacing:.1em}
  .meta{font-size:11px;color:#6b7280;margin-top:6px;line-height:1.7}
  table{width:100%;border-collapse:collapse;margin-top:8px}
  th,td{padding:7px 8px;border:1px solid #e5e7eb;text-align:left}
  th{background:#f8fafc;font-size:10px;color:#475569;text-align:center}
  td.c{text-align:center} td.b{font-weight:800;color:#1e293b} td.muted{color:#b45309}
  tfoot td{font-weight:800;background:#f8fafc}
  .note{margin-top:14px;font-size:10px;color:#6b7280;line-height:1.8}
  @media print{body{margin:12mm}}
</style></head><body>
  <div class="head">
    <div class="brand">GuestFollow</div>
    <h1>住宅宿泊事業法 第14条 定期報告（宿泊実績）</h1>
    <div class="meta">
      対象期間：${esc(period.start)} 〜 ${esc(period.end)}　／　提出期限：${esc(period.deadline)}<br>
      出力日：${today}
    </div>
  </div>
  <table>
    <thead><tr>
      <th>届出住宅（施設）</th><th>宿泊日数<br>(実稼働日)</th><th>宿泊者数</th><th>延べ宿泊者数</th>
      <th>うち日本人<br>(延べ)</th><th>うち外国人<br>(延べ)</th><th>国籍未登録<br>(延べ)</th>
    </tr></thead>
    <tbody>${rowsHtml || '<tr><td colspan="7" style="text-align:center;color:#9ca3af;padding:20px;">対象期間の宿泊実績がありません</td></tr>'}</tbody>
    <tfoot><tr>
      <td>合計</td><td class="c">${totals.distinctNights}</td><td class="c">${totals.guests}</td><td class="c">${totals.guestNights}</td>
      <td class="c">${rows.reduce((s, r) => s + jpOf(r), 0)}</td>
      <td class="c">${rows.reduce((s, r) => s + foreignOf(r), 0)}</td>
      <td class="c">${rows.reduce((s, r) => s + unknownOf(r), 0)}</td>
    </tr></tfoot>
  </table>
  <div class="note">
    ※ 宿泊日数＝届出住宅に人を宿泊させた実日数（同日に複数予約があっても1日）。宿泊者数＝実人数。延べ宿泊者数＝人数×泊数（人泊）。<br>
    ※ 国籍別内訳は電子宿泊者名簿（事前登録）を優先し、無い場合はOTAのゲスト国情報から判定。「国籍未登録」はどちらも無い予約分です。提出前にご確認ください。<br>
    ※ キャンセル予約は除外。泊数は対象期間内に含まれる夜のみを計上しています。
  </div>
  <script>window.onload=function(){window.print()}</script>
</body></html>`
    const w = window.open('', '_blank')
    if (!w) { alert('ポップアップがブロックされました。ブラウザのポップアップを許可してください。'); return }
    w.document.open(); w.document.write(html); w.document.close()
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardCheck size={24} className="text-navy-600" /> 宿泊実績報告
          </h2>
          <p className="text-gray-400 text-sm mt-0.5">
            住宅宿泊事業法 第14条の定期報告（隔月）用の集計
            <button onClick={() => setShowInfo(true)} className="ml-1.5 text-navy-500 hover:text-navy-700 align-middle" aria-label="報告について">
              <Info size={14} className="inline" />
            </button>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleCsv} className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors">
            <Download size={15} /> CSV出力
          </button>
          <button onClick={handlePdf} className="inline-flex items-center gap-1.5 text-sm font-medium text-white bg-navy-600 border border-navy-600 rounded-lg px-3 py-2 hover:bg-navy-700 transition-colors">
            <FileText size={15} /> PDF出力
          </button>
        </div>
      </div>

      {/* 期間選択 */}
      <div className="bg-white border border-gray-200 rounded-xl p-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-sm text-gray-500">
          <CalendarDays size={15} /> 報告対象期間
        </div>
        <div className="relative">
          <select
            value={periodId}
            onChange={e => setPeriodId(e.target.value)}
            className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg pl-3 pr-8 py-1.5 appearance-none focus:outline-none focus:ring-2 focus:ring-navy-300 cursor-pointer"
          >
            {periods.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
        {period && (
          <span className="text-xs text-navy-700 bg-navy-50 border border-navy-200 rounded-lg px-2.5 py-1">
            提出期限：{period.deadline}
          </span>
        )}
      </div>

      {/* サマリー */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl border bg-gray-50 border-gray-200">
          <p className="text-xs font-medium text-gray-500">宿泊日数（実稼働日）</p>
          <p className="text-2xl sm:text-3xl font-black text-gray-900">{totals.distinctNights}<span className="text-base font-bold ml-1">日</span></p>
        </div>
        <div className="p-4 rounded-xl border bg-gray-50 border-gray-200">
          <p className="text-xs font-medium text-gray-500">宿泊者数（実人数）</p>
          <p className="text-2xl sm:text-3xl font-black text-gray-900">{totals.guests}<span className="text-base font-bold ml-1">人</span></p>
        </div>
        <div className="p-4 rounded-xl border bg-navy-50 border-navy-200">
          <p className="text-xs font-medium text-navy-600">延べ宿泊者数（人泊）</p>
          <p className="text-2xl sm:text-3xl font-black text-navy-700">{totals.guestNights}<span className="text-base font-bold ml-1">人泊</span></p>
        </div>
      </div>

      {/* 施設別テーブル */}
      {rows.length > 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500">
                  <th className="text-left font-semibold px-4 py-3">届出住宅（施設）<span className="font-normal text-gray-400 ml-1">▸ 行をタップで明細</span></th>
                  <th className="text-center font-semibold px-3 py-3">宿泊日数<br /><span className="font-normal">(実稼働日)</span></th>
                  <th className="text-center font-semibold px-3 py-3">宿泊者数</th>
                  <th className="text-center font-semibold px-3 py-3">延べ宿泊者数</th>
                  <th className="text-center font-semibold px-3 py-3">うち日本人</th>
                  <th className="text-center font-semibold px-3 py-3">うち外国人</th>
                  <th className="text-center font-semibold px-3 py-3 text-amber-600">国籍未登録</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map(r => {
                  const isOpen = expanded.has(r.facility.id)
                  // 国籍内訳（延べ人泊の多い順）
                  const natEntries = Object.entries(r.byNat).sort((a, b) => b[1] - a[1])
                  return (
                    <Fragment key={r.facility.id}>
                      <tr
                        onClick={() => toggleExpand(r.facility.id)}
                        className="hover:bg-navy-50/40 cursor-pointer"
                        aria-expanded={isOpen}
                      >
                        <td className="px-4 py-3 font-medium text-gray-900">
                          <span className="flex items-center gap-1.5">
                            <ChevronDown size={14} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : '-rotate-90'}`} />
                            {r.facility.name}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center text-gray-700">{r.distinctNights}</td>
                        <td className="px-3 py-3 text-center text-gray-700">{r.guests}</td>
                        <td className="px-3 py-3 text-center font-bold text-navy-700">{r.guestNights}</td>
                        <td className="px-3 py-3 text-center text-gray-700">{jpOf(r)}</td>
                        <td className="px-3 py-3 text-center text-gray-700">{foreignOf(r)}</td>
                        <td className={`px-3 py-3 text-center ${unknownOf(r) > 0 ? 'text-amber-600 font-semibold' : 'text-gray-300'}`}>{unknownOf(r)}</td>
                      </tr>
                      {isOpen && (
                        <tr className="bg-gray-50/70">
                          <td colSpan={7} className="px-4 py-4">
                            {/* 国籍内訳 */}
                            <div className="mb-4">
                              <p className="text-xs font-semibold text-gray-600 mb-2">国籍内訳（延べ宿泊者数・人泊）</p>
                              <div className="flex flex-wrap gap-1.5">
                                {natEntries.map(([nat, n]) => {
                                  const tone = nat === '日本'
                                    ? 'text-blue-700 bg-blue-50 border-blue-200'
                                    : nat === '未登録'
                                      ? 'text-amber-700 bg-amber-50 border-amber-200'
                                      : 'text-emerald-700 bg-emerald-50 border-emerald-200'
                                  return (
                                    <span key={nat} className={`text-xs font-medium px-2 py-1 rounded-lg border ${tone}`}>
                                      {nat}：{n}人泊
                                    </span>
                                  )
                                })}
                              </div>
                            </div>
                            {/* 宿泊明細 */}
                            <p className="text-xs font-semibold text-gray-600 mb-2">宿泊明細（対象期間内・{r.details.length}件）</p>
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs min-w-[560px] bg-white border border-gray-200 rounded-lg">
                                <thead>
                                  <tr className="bg-gray-50 text-gray-500 border-b border-gray-200">
                                    <th className="text-left font-semibold px-3 py-2">宿泊日</th>
                                    <th className="text-left font-semibold px-3 py-2">予約名 / 経路</th>
                                    <th className="text-center font-semibold px-3 py-2">人数</th>
                                    <th className="text-center font-semibold px-3 py-2">泊数<br />(期間内)</th>
                                    <th className="text-center font-semibold px-3 py-2">延べ<br />(人泊)</th>
                                    <th className="text-left font-semibold px-3 py-2">国籍</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {r.details.map(d => (
                                    <tr key={d.id}>
                                      <td className="px-3 py-2 whitespace-nowrap text-gray-700">{formatDate(d.checkin)} 〜 {formatDate(d.checkout)}</td>
                                      <td className="px-3 py-2 text-gray-700">
                                        {d.guestName || <span className="text-gray-300">—</span>}
                                        {d.channel && <span className="text-gray-400 ml-1">({d.channel})</span>}
                                      </td>
                                      <td className="px-3 py-2 text-center text-gray-700">{d.guests}</td>
                                      <td className="px-3 py-2 text-center text-gray-700">{d.nightsInPeriod}</td>
                                      <td className="px-3 py-2 text-center font-semibold text-navy-700">{d.guestNights}</td>
                                      <td className="px-3 py-2">
                                        <span className={d.nat === '未登録' ? 'text-amber-600' : 'text-gray-700'}>{d.nat}</span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bg-navy-50 border-t border-navy-200 font-bold text-navy-700">
                  <td className="px-4 py-3">合計</td>
                  <td className="px-3 py-3 text-center">{totals.distinctNights}</td>
                  <td className="px-3 py-3 text-center">{totals.guests}</td>
                  <td className="px-3 py-3 text-center">{totals.guestNights}</td>
                  <td className="px-3 py-3 text-center">{rows.reduce((s, r) => s + jpOf(r), 0)}</td>
                  <td className="px-3 py-3 text-center">{rows.reduce((s, r) => s + foreignOf(r), 0)}</td>
                  <td className="px-3 py-3 text-center text-amber-600">{rows.reduce((s, r) => s + unknownOf(r), 0)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl text-center py-16 text-gray-400">
          <ClipboardCheck size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">対象期間の宿泊実績がありません</p>
          <p className="text-xs mt-1">期間を変更するか、予約一覧で「予約を同期」を実行してください</p>
        </div>
      )}

      <p className="text-xs text-gray-400 leading-relaxed">
        ※ 集計は予約データ（キャンセル除く）に基づきます。国籍別内訳は「電子宿泊者名簿（事前登録）」を優先し、名簿が無い予約はOTA（Beds24）のゲスト国情報から判定します。どちらも無い場合のみ「国籍未登録」に集計します。
        提出前に内容をご確認のうえ、民泊制度運営システムへ入力・アップロードしてください。
      </p>

      {/* 説明ポップアップ */}
      {showInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowInfo(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <Info size={20} className="text-navy-600 shrink-0" />
                <h3 className="text-lg font-bold text-gray-900">住宅宿泊事業法 第14条 定期報告について</h3>
              </div>
              <button onClick={() => setShowInfo(false)} className="text-gray-400 hover:text-gray-600" aria-label="閉じる"><X size={20} /></button>
            </div>
            <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
              <p>住宅宿泊事業者は、届出住宅に人を宿泊させた日数等を、<span className="font-semibold">2か月ごと（年6回）</span>都道府県知事等へ報告する義務があります。</p>
              <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
                <p className="font-semibold text-gray-900 mb-1">報告事項</p>
                <ul className="list-disc pl-5 space-y-0.5">
                  <li>届出住宅に人を宿泊させた日数（宿泊日数）</li>
                  <li>宿泊者数</li>
                  <li>延べ宿泊者数（人泊）</li>
                  <li>国籍別の宿泊者数の内訳</li>
                </ul>
              </div>
              <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
                <p className="font-semibold text-gray-900 mb-1">提出期限（各期間の翌月15日）</p>
                <p className="text-xs">2/15・4/15・6/15・8/15・10/15・12/15 までに、それぞれ直前2か月分を報告します。</p>
              </div>
              <p className="text-xs text-gray-500">
                提出は「民泊制度運営システム」への直接入力またはCSVアップロードで行います。本画面のCSV/PDFは集計の下書きです。
                届出番号など様式固有の項目は、提出時にシステム側でご入力ください。
              </p>
            </div>
            <button onClick={() => setShowInfo(false)} className="w-full bg-navy-600 hover:bg-navy-700 text-white font-medium rounded-lg py-2.5 transition-colors">閉じる</button>
          </div>
        </div>
      )}
    </div>
  )
}
