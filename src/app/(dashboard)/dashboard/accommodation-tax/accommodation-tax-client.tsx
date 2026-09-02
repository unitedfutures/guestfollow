'use client'

import { useMemo, useState } from 'react'
import { Coins, CalendarDays, ChevronDown, XCircle, Download, FileText, Info, X } from 'lucide-react'
import { computeTax, isTaxEnabled, type AccommodationTax } from '@/lib/tax/accommodation-tax'
import { formatYen as yen, jstDate } from '@/lib/utils'

type Facility = { id: string; name: string; accommodation_tax: AccommodationTax | null }
type Booking = {
  id: string
  facility_id: string
  checkin_date: string
  checkout_date: string
  num_guests: number
  ota_status: string | null
  price: number | null
  room_charge: number | null
}

const dayNum = (s: string) => Math.floor(Date.parse(`${s}T00:00:00Z`) / 86400000)
// 当月の初日・末日（UTC基準だと月初の深夜0〜9時に前月扱いになるためJSTの暦日から算出）
const [nowY, nowM] = jstDate().split('-').map(Number)
const iso = (d: Date) => d.toISOString().split('T')[0]
const monthStart = iso(new Date(Date.UTC(nowY, nowM - 1, 1)))
const monthEnd = iso(new Date(Date.UTC(nowY, nowM, 0)))

export function AccommodationTaxClient({ facilities, bookings }: { facilities: Facility[]; bookings: Booking[] }) {
  const [dateFrom, setDateFrom] = useState(monthStart)
  const [dateTo, setDateTo] = useState(monthEnd)
  const [showInfo, setShowInfo] = useState(false)
  const [showMonth, setShowMonth] = useState(false)

  const applyMonth = (month: string) => {
    if (!month) return
    const [y, m] = month.split('-').map(Number)
    if (!y || !m) return
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate()
    const mm = String(m).padStart(2, '0')
    setDateFrom(`${y}-${mm}-01`)
    setDateTo(`${y}-${mm}-${String(last).padStart(2, '0')}`)
    setShowMonth(false)
  }

  const facMap = useMemo(() => new Map(facilities.map(f => [f.id, f])), [facilities])
  const taxedFacilities = useMemo(() => facilities.filter(f => isTaxEnabled(f.accommodation_tax)), [facilities])

  const { rows, totalTax, totalNights, totalGuestNights } = useMemo(() => {
    const pStart = dateFrom ? dayNum(dateFrom) : -Infinity
    const pEnd = dateTo ? dayNum(dateTo) : Infinity
    const agg = new Map<string, { facility: Facility; tax: number; nights: number; guestNights: number; base: number }>()
    for (const f of taxedFacilities) agg.set(f.id, { facility: f, tax: 0, nights: 0, guestNights: 0, base: 0 })

    for (const b of bookings) {
      if (b.ota_status === 'cancelled') continue
      const f = facMap.get(b.facility_id)
      if (!f || !isTaxEnabled(f.accommodation_tax)) continue
      const ci = dayNum(b.checkin_date)
      const co = dayNum(b.checkout_date)
      const totalNights = co - ci
      if (totalNights <= 0) continue
      const from = Math.max(ci, pStart)
      const to = Math.min(co - 1, pEnd)
      const nightsInPeriod = to - from + 1
      if (nightsInPeriod <= 0) continue

      const guests = b.num_guests || 1
      const base = b.room_charge ?? b.price ?? 0
      const tax = computeTax(f.accommodation_tax as AccommodationTax, base, guests, totalNights, nightsInPeriod)

      const a = agg.get(f.id)!
      a.tax += tax
      a.nights += nightsInPeriod
      a.guestNights += guests * nightsInPeriod
      a.base += base * (nightsInPeriod / totalNights)
    }

    const rows = [...agg.values()].filter(r => r.guestNights > 0)
    const totalTax = rows.reduce((s, r) => s + r.tax, 0)
    const totalNights = rows.reduce((s, r) => s + r.nights, 0)
    const totalGuestNights = rows.reduce((s, r) => s + r.guestNights, 0)
    return { rows, totalTax, totalNights, totalGuestNights }
  }, [bookings, taxedFacilities, facMap, dateFrom, dateTo])

  const periodTag = (dateTo || dateFrom || iso(new Date())).slice(0, 7).replace('-', '')
  const baseName = `宿泊税_${periodTag}`
  const taxLabelOf = (f: Facility) => (f.accommodation_tax && f.accommodation_tax.enabled ? (f.accommodation_tax.label || (f.accommodation_tax.type === 'percent' ? `${f.accommodation_tax.percent}%` : '段階定額')) : '')

  const handleCsv = () => {
    const head = ['施設名', '自治体/方式', '課税対象宿泊料', '延べ宿泊者数(人泊)', '宿泊税額']
    const lines = rows.map(r => [r.facility.name, taxLabelOf(r.facility), Math.round(r.base), r.guestNights, r.tax])
    const esc = (v: unknown) => `"${String(v).replace(/"/g, '""')}"`
    const meta = [`対象期間,${dateFrom || '—'} 〜 ${dateTo || '—'}`, '']
    const bom = '﻿'
    const csv = bom + [
      ...meta.map(m => m.split(',').map(esc).join(',')),
      head.map(esc).join(','),
      ...lines.map(l => l.map(esc).join(',')),
      ['合計', '', '', totalGuestNights, totalTax].map(esc).join(','),
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${baseName}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const handlePdf = () => {
    const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string))
    const today = new Date().toLocaleDateString('ja-JP')
    const rowsHtml = rows.map(r => `
      <tr><td>${esc(r.facility.name)}</td><td>${esc(taxLabelOf(r.facility))}</td>
      <td class="r">${yen(r.base)}</td><td class="c">${r.guestNights}</td><td class="r b">${yen(r.tax)}</td></tr>`).join('')
    const html = `<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>${esc(baseName)}</title>
<style>*{box-sizing:border-box}body{font-family:'Hiragino Sans','Helvetica Neue',Arial,sans-serif;color:#1f2937;margin:32px;font-size:12px}
.head{border-bottom:2px solid #1e293b;padding-bottom:12px;margin-bottom:16px}h1{font-size:18px;margin:0}.brand{font-size:11px;color:#6366f1;font-weight:700;letter-spacing:.1em}
.meta{font-size:11px;color:#6b7280;margin-top:6px}table{width:100%;border-collapse:collapse;margin-top:8px}
th,td{padding:7px 8px;border:1px solid #e5e7eb;text-align:left}th{background:#f8fafc;font-size:10px;color:#475569}
td.r{text-align:right;white-space:nowrap}td.c{text-align:center}td.b{font-weight:800;color:#1e293b}tfoot td{font-weight:800;background:#f8fafc}
.note{margin-top:12px;font-size:10px;color:#6b7280;line-height:1.7}@media print{body{margin:12mm}}</style></head><body>
<div class="head"><div class="brand">GuestFollow</div><h1>宿泊税 集計</h1>
<div class="meta">対象期間：${esc(dateFrom || '—')} 〜 ${esc(dateTo || '—')}　／　出力日：${today}</div></div>
<table><thead><tr><th>施設</th><th>自治体/方式</th><th>課税対象宿泊料</th><th>延べ宿泊者数</th><th>宿泊税額</th></tr></thead>
<tbody>${rowsHtml || '<tr><td colspan="5" style="text-align:center;color:#9ca3af;padding:20px;">対象がありません</td></tr>'}</tbody>
<tfoot><tr><td colspan="3">合計</td><td class="c">${totalGuestNights}</td><td class="r">${yen(totalTax)}</td></tr></tfoot></table>
<div class="note">※ 宿泊税額は各施設に設定した宿泊税ルールに基づく概算です。課税標準は「宿泊料（清掃料等を除く）」。実際の申告額は各自治体の条例をご確認ください。</div>
<script>window.onload=function(){window.print()}</script></body></html>`
    const w = window.open('', '_blank')
    if (!w) { alert('ポップアップがブロックされました。'); return }
    w.document.open(); w.document.write(html); w.document.close()
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Coins size={24} className="text-navy-600" /> 宿泊税計算
            <button onClick={() => setShowInfo(true)} className="text-navy-500 hover:text-navy-700" aria-label="宿泊税について"><Info size={16} /></button>
          </h2>
          <p className="text-gray-400 text-sm mt-0.5">施設ごとの宿泊税ルールに基づき、期間内の税額を集計します</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleCsv} className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50">
            <Download size={15} /> CSV出力
          </button>
          <button onClick={handlePdf} className="inline-flex items-center gap-1.5 text-sm font-medium text-white bg-navy-600 border border-navy-600 rounded-lg px-3 py-2 hover:bg-navy-700">
            <FileText size={15} /> PDF出力
          </button>
        </div>
      </div>

      {/* 期間 */}
      <div className="bg-white border border-gray-200 rounded-xl p-3 flex flex-wrap items-center gap-2">
        <CalendarDays size={14} className="text-gray-400" />
        <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1">
          <input type="date" value={dateFrom} max={dateTo || undefined} onChange={e => setDateFrom(e.target.value)}
            aria-label="開始日" className="text-sm text-gray-700 bg-transparent focus:outline-none w-[7.5rem]" />
          <span className="text-gray-400 text-xs">〜</span>
          <input type="date" value={dateTo} min={dateFrom || undefined} onChange={e => setDateTo(e.target.value)}
            aria-label="終了日" className="text-sm text-gray-700 bg-transparent focus:outline-none w-[7.5rem]" />
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(''); setDateTo('') }} className="text-gray-400 hover:text-gray-600" aria-label="クリア"><XCircle size={14} /></button>
          )}
        </div>
        <div className="relative">
          <button onClick={() => setShowMonth(v => !v)}
            className="inline-flex items-center gap-1.5 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-100">
            <CalendarDays size={13} className="text-gray-400" /> 月で選択 <ChevronDown size={12} className="text-gray-400" />
          </button>
          {showMonth && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMonth(false)} />
              <div className="absolute z-20 mt-1 left-0 bg-white border border-gray-200 rounded-xl shadow-lg p-3 w-56">
                <input type="month" defaultValue={(dateTo || dateFrom || iso(new Date())).slice(0, 7)}
                  onChange={e => applyMonth(e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-300" />
              </div>
            </>
          )}
        </div>
      </div>

      {taxedFacilities.length === 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          宿泊税を設定した施設がありません。<span className="font-medium">施設管理 → 各施設の「宿泊税の設定」</span>から、自治体プリセットまたはカスタムで税ルールを設定してください。
        </div>
      ) : (
        <>
          {/* サマリー */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            <div className="p-4 rounded-xl border bg-navy-50 border-navy-200">
              <p className="text-xs font-medium text-navy-600">宿泊税額（合計）</p>
              <p className="text-2xl sm:text-3xl font-black text-navy-700">{yen(totalTax)}</p>
            </div>
            <div className="p-4 rounded-xl border bg-gray-50 border-gray-200">
              <p className="text-xs font-medium text-gray-500">延べ宿泊者数</p>
              <p className="text-2xl sm:text-3xl font-black text-gray-900">{totalGuestNights}<span className="text-base font-bold ml-1">人泊</span></p>
            </div>
            <div className="p-4 rounded-xl border bg-gray-50 border-gray-200">
              <p className="text-xs font-medium text-gray-500">泊数</p>
              <p className="text-2xl sm:text-3xl font-black text-gray-900">{totalNights}<span className="text-base font-bold ml-1">泊</span></p>
            </div>
          </div>

          {/* テーブル */}
          {rows.length > 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[640px]">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500">
                      <th className="text-left font-semibold px-4 py-3">施設</th>
                      <th className="text-left font-semibold px-3 py-3">自治体/方式</th>
                      <th className="text-right font-semibold px-3 py-3">課税対象宿泊料</th>
                      <th className="text-center font-semibold px-3 py-3">延べ宿泊者数</th>
                      <th className="text-right font-semibold px-3 py-3">宿泊税額</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {rows.map(r => (
                      <tr key={r.facility.id} className="hover:bg-gray-50/60">
                        <td className="px-4 py-3 font-medium text-gray-900">{r.facility.name}</td>
                        <td className="px-3 py-3 text-gray-600">{taxLabelOf(r.facility)}</td>
                        <td className="px-3 py-3 text-right text-gray-700">{yen(r.base)}</td>
                        <td className="px-3 py-3 text-center text-gray-700">{r.guestNights}</td>
                        <td className="px-3 py-3 text-right font-bold text-navy-700">{yen(r.tax)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-navy-50 border-t border-navy-200 font-bold text-navy-700">
                      <td className="px-4 py-3" colSpan={3}>合計</td>
                      <td className="px-3 py-3 text-center">{totalGuestNights}</td>
                      <td className="px-3 py-3 text-right text-base">{yen(totalTax)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl text-center py-16 text-gray-400">
              <Coins size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">対象期間の課税対象がありません</p>
            </div>
          )}
        </>
      )}

      <p className="text-xs text-gray-400 leading-relaxed">
        ※ 宿泊税額は各施設に設定した宿泊税ルールに基づく概算です。課税標準は「宿泊料（清掃料等を除く）」で、Beds24予約は内訳から自動算出、取得できない予約は総額を使用します。実際の申告・納付額は各自治体の条例・様式に従ってください。キャンセルは除外。
      </p>

      {showInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowInfo(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2"><Info size={20} className="text-navy-600" /><h3 className="text-lg font-bold text-gray-900">宿泊税について</h3></div>
              <button onClick={() => setShowInfo(false)} className="text-gray-400 hover:text-gray-600" aria-label="閉じる"><X size={20} /></button>
            </div>
            <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
              <p>宿泊税は一部の自治体が宿泊者に課す税で、<span className="font-semibold">税率・課税方式・免税点が自治体ごとに異なります</span>。</p>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li><span className="font-medium">段階定額</span>：1人1泊あたりの宿泊料に応じた定額（例：東京都 1万円未満は非課税、1〜1.5万円100円、1.5万円以上200円）</li>
                <li><span className="font-medium">定率</span>：宿泊料に対する％（例：倶知安町 2%）</li>
              </ul>
              <p className="text-xs">課税標準は「宿泊料のみ（清掃料・食事等を除く）」を用います。施設ごとの設定は<span className="font-medium">施設管理 → 宿泊税の設定</span>で行えます。</p>
              <p className="text-xs text-gray-500">本画面は集計の目安です。最新の税率・非課税要件・申告様式は必ず各自治体の条例でご確認ください。</p>
            </div>
            <button onClick={() => setShowInfo(false)} className="w-full bg-navy-600 hover:bg-navy-700 text-white font-medium rounded-lg py-2.5">閉じる</button>
          </div>
        </div>
      )}
    </div>
  )
}
