'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  BarChart3, TrendingUp, TrendingDown, Coins, BedDouble, Users, CalendarCheck,
  ChevronDown, ArrowRight, Info,
} from 'lucide-react'
import { formatYen } from '@/lib/utils'
import { adr, occupancy, revpar, sumKpi, type Kpi, type MonthlyKpi } from '@/lib/analytics/kpi'

type Facility = { id: string; name: string }

type Props = {
  facilities: Facility[]
  past: MonthlyKpi[]      // 実績（直近12ヶ月・当月を含む）
  future: MonthlyKpi[]    // オンハンド（翌月以降6ヶ月）
  currentMonth: string    // YYYY-MM
  excludedFacilityCount: number  // 期間中に予約が無く稼働率の対象外にした施設数
}

const METRICS = [
  { key: 'revenue', label: '売上', format: (k: Kpi) => formatYen(Math.round(k.revenue)) },
  { key: 'occupancy', label: '稼働率', format: (k: Kpi) => `${(occupancy(k) * 100).toFixed(1)}%` },
  { key: 'adr', label: 'ADR', format: (k: Kpi) => formatYen(Math.round(adr(k))) },
  { key: 'guestNights', label: '延べ宿泊人数', format: (k: Kpi) => `${k.guestNights.toLocaleString()}人泊` },
  { key: 'guests', label: '宿泊客数', format: (k: Kpi) => `${k.guests.toLocaleString()}人` },
  { key: 'roomNights', label: '稼働日数', format: (k: Kpi) => `${k.roomNights.toLocaleString()}泊` },
] as const
type MetricKey = (typeof METRICS)[number]['key']

const metricValue = (k: Kpi, key: MetricKey): number => {
  switch (key) {
    case 'revenue': return k.revenue
    case 'occupancy': return occupancy(k) * 100
    case 'adr': return adr(k)
    case 'guestNights': return k.guestNights
    case 'guests': return k.guests
    case 'roomNights': return k.roomNights
  }
}

// グラフは「8月」、表は「26/8」と短く出す（同じ月名が2度出るため表では年を付ける）
const monthLabel = (m: string) => {
  const [y, mm] = m.split('-')
  return Number(mm) === 1 ? `${y}/1` : `${Number(mm)}月`
}
const shortMonthLabel = (m: string) => {
  const [y, mm] = m.split('-')
  return `${y.slice(2)}/${Number(mm)}`
}

export function ManagementDashboard({ facilities, past, future, currentMonth, excludedFacilityCount }: Props) {
  const [facilityId, setFacilityId] = useState<string>('all')
  const [metric, setMetric] = useState<MetricKey>('revenue')

  // 施設を絞り込んだ月次データ（全施設のときはそのまま使う）
  const pick = (rows: MonthlyKpi[]): (Kpi & { month: string })[] =>
    rows.map(r => (facilityId === 'all' ? r : { ...r.byFacility[facilityId], month: r.month }))

  const pastRows = useMemo(() => pick(past), [past, facilityId]) // eslint-disable-line react-hooks/exhaustive-deps
  const futureRows = useMemo(() => pick(future), [future, facilityId]) // eslint-disable-line react-hooks/exhaustive-deps

  const pastTotal = useMemo(() => sumKpi(pastRows), [pastRows])
  const futureTotal = useMemo(() => sumKpi(futureRows), [futureRows])
  const thisMonth = pastRows[pastRows.length - 1]
  const lastMonth = pastRows[pastRows.length - 2]
  const sameMonthLastYear = pastRows[0] // 12ヶ月前＝前年同月

  const facilityName = facilityId === 'all' ? '全施設' : facilities.find(f => f.id === facilityId)?.name ?? ''

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 size={24} className="text-navy-600" /> 経営管理
          </h2>
          <p className="text-gray-400 text-sm mt-0.5">
            実績12ヶ月（{past[0]?.month.replace('-', '/')}〜{currentMonth.replace('-', '/')}）と、今後6ヶ月のオンハンド（予約済み）
          </p>
        </div>
        <div className="relative">
          <select value={facilityId} onChange={e => setFacilityId(e.target.value)}
            className="text-sm text-gray-700 bg-white border border-gray-200 rounded-lg pl-3 pr-8 py-2 appearance-none focus:outline-none focus:ring-2 focus:ring-navy-300 cursor-pointer">
            <option value="all">全施設</option>
            {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* 当月のKPI */}
      <div>
        <p className="text-xs font-semibold text-gray-500 mb-2">{currentMonth.replace('-', '年')}月の実績（{facilityName}）</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard icon={Coins} label="売上" value={formatYen(Math.round(thisMonth?.revenue ?? 0))}
            compare={[
              { label: '前月', from: lastMonth?.revenue ?? 0, to: thisMonth?.revenue ?? 0 },
              { label: '前年同月', from: sameMonthLastYear?.revenue ?? 0, to: thisMonth?.revenue ?? 0 },
            ]} />
          <KpiCard icon={BedDouble} label="稼働率" value={`${((occupancy(thisMonth ?? sumKpi([]))) * 100).toFixed(1)}%`}
            sub={`${thisMonth?.roomNights ?? 0}泊 / 販売可能 ${thisMonth?.capacity ?? 0}泊`} />
          <KpiCard icon={TrendingUp} label="ADR（1泊平均単価）" value={formatYen(Math.round(adr(thisMonth ?? sumKpi([]))))}
            sub={`RevPAR ${formatYen(Math.round(revpar(thisMonth ?? sumKpi([]))))}`} />
          <KpiCard icon={Users} label="宿泊客数" value={`${(thisMonth?.guests ?? 0).toLocaleString()}人`}
            sub={`延べ ${(thisMonth?.guestNights ?? 0).toLocaleString()}人泊 / ${thisMonth?.bookings ?? 0}件`} />
        </div>
      </div>

      {/* 直近12ヶ月と今後6ヶ月の合計 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <SummaryCard title="直近12ヶ月の実績" tone="navy" kpi={pastTotal} />
        <SummaryCard title="今後6ヶ月のオンハンド（現時点の予約済み）" tone="gold" kpi={futureTotal} />
      </div>

      {/* 売上と稼働率の推移 */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-semibold text-gray-700">売上と稼働率の推移</p>
          <div className="flex items-center gap-3 text-[11px] text-gray-500">
            <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-navy-500 inline-block" />実績</span>
            <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-gold-400 inline-block" />オンハンド</span>
            <span className="flex items-center gap-1"><span className="w-4 h-0.5 bg-emerald-500 inline-block" />稼働率</span>
          </div>
        </div>
        <RevenueOccupancyChart past={pastRows} future={futureRows} />
      </div>

      {/* 施設別の内訳 */}
      {facilityId === 'all' && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">施設別の売上（直近12ヶ月）</p>
          <FacilityShare facilities={facilities} past={past} />
        </div>
      )}

      {/* 施設×月のマトリクス */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <p className="text-sm font-semibold text-gray-700">施設別・月別</p>
          <div className="flex flex-wrap gap-1">
            {METRICS.map(m => (
              <button key={m.key} onClick={() => setMetric(m.key)}
                className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${metric === m.key ? 'bg-navy-600 text-white border-navy-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                {m.label}
              </button>
            ))}
          </div>
        </div>
        <FacilityMatrix facilities={facilities} past={past} future={future} metric={metric} currentMonth={currentMonth} />
      </div>

      <div className="flex flex-wrap items-start gap-2 text-xs text-gray-400">
        <Info size={13} className="shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          月をまたぐ予約は泊数で按分しています。キャンセルは除外。稼働率は「1施設1室」として、稼働日数 ÷（施設数 × 日数）で計算しています。
          {excludedFacilityCount > 0 && <>期間中に予約が無い施設{excludedFacilityCount}件は集計から除いています。</>}
          金額はBeds24から取得した予約金額です（OTA手数料を含む）。
          明細は<Link href="/dashboard/reports" className="text-navy-600 hover:underline">売上レポート</Link>、
          予約ごとの状況は<Link href="/dashboard/bookings" className="text-navy-600 hover:underline">予約一覧</Link>で確認できます。
        </p>
      </div>
    </div>
  )
}

function KpiCard({ icon: Icon, label, value, sub, compare }: {
  icon: typeof Coins; label: string; value: string; sub?: string
  compare?: { label: string; from: number; to: number }[]
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <p className="text-xs text-gray-500 flex items-center gap-1.5"><Icon size={13} className="text-navy-500" /> {label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1.5 tabular-nums">{value}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-1">{sub}</p>}
      {compare && (
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
          {compare.map(c => {
            const rate = c.from ? (c.to - c.from) / c.from : null
            const up = (rate ?? 0) >= 0
            return (
              <span key={c.label} className="text-[11px] text-gray-400 flex items-center gap-0.5">
                {c.label}
                {rate === null ? <span className="text-gray-300">—</span> : (
                  <span className={`flex items-center gap-0.5 font-medium ${up ? 'text-emerald-600' : 'text-red-500'}`}>
                    {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                    {up ? '+' : ''}{(rate * 100).toFixed(0)}%
                  </span>
                )}
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}

function SummaryCard({ title, kpi, tone }: { title: string; kpi: Kpi; tone: 'navy' | 'gold' }) {
  const items = [
    { label: '売上', value: formatYen(Math.round(kpi.revenue)) },
    { label: '稼働率', value: `${(occupancy(kpi) * 100).toFixed(1)}%` },
    { label: 'ADR', value: formatYen(Math.round(adr(kpi))) },
    { label: '延べ宿泊人数', value: `${kpi.guestNights.toLocaleString()}人泊` },
    { label: '宿泊客数', value: `${kpi.guests.toLocaleString()}人` },
  ]
  return (
    <div className={`rounded-xl border p-4 ${tone === 'navy' ? 'bg-navy-50/60 border-navy-100' : 'bg-gold-50/60 border-gold-200'}`}>
      <p className="text-xs font-semibold text-gray-600 mb-3">{title}</p>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {items.map(i => (
          <div key={i.label}>
            <p className="text-[11px] text-gray-500">{i.label}</p>
            <p className="text-sm font-bold text-gray-900 tabular-nums mt-0.5">{i.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

/** 売上（棒）と稼働率（折れ線）を1つの図にまとめる */
function RevenueOccupancyChart({ past, future }: { past: (Kpi & { month: string })[]; future: (Kpi & { month: string })[] }) {
  const rows = [...past, ...future]
  const W = 900, H = 260, padL = 64, padR = 44, padT = 16, padB = 28
  const innerW = W - padL - padR, innerH = H - padT - padB
  const maxRevenue = Math.max(1, ...rows.map(r => r.revenue))
  const step = innerW / rows.length
  const barW = Math.min(34, step * 0.62)
  const x = (i: number) => padL + step * i + step / 2
  const yRevenue = (v: number) => padT + innerH - (v / maxRevenue) * innerH
  const yOcc = (v: number) => padT + innerH - Math.min(1, v) * innerH

  const linePoints = rows.map((r, i) => `${x(i)},${yOcc(occupancy(r))}`).join(' ')
  const yen = (v: number) => (v >= 10_000_000 ? `${Math.round(v / 1_000_000)}00万` : v >= 10_000 ? `${Math.round(v / 10_000)}万` : String(Math.round(v)))

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[720px]" role="img" aria-label="売上と稼働率の推移">
        {/* 目盛り */}
        {[0, 0.25, 0.5, 0.75, 1].map(t => (
          <g key={t}>
            <line x1={padL} x2={W - padR} y1={padT + innerH * (1 - t)} y2={padT + innerH * (1 - t)} stroke="#f1f5f9" strokeWidth={1} />
            <text x={padL - 8} y={padT + innerH * (1 - t) + 4} textAnchor="end" fontSize={10} fill="#94a3b8">{yen(maxRevenue * t)}</text>
            <text x={W - padR + 8} y={padT + innerH * (1 - t) + 4} fontSize={10} fill="#10b981">{Math.round(t * 100)}%</text>
          </g>
        ))}
        {/* 実績とオンハンドの境目 */}
        {future.length > 0 && (
          <line x1={padL + step * past.length} x2={padL + step * past.length} y1={padT} y2={padT + innerH}
            stroke="#cbd5e1" strokeWidth={1} strokeDasharray="4 3" />
        )}
        {rows.map((r, i) => {
          const isFuture = i >= past.length
          const h = Math.max(0, padT + innerH - yRevenue(r.revenue))
          return (
            <g key={r.month}>
              <rect x={x(i) - barW / 2} y={yRevenue(r.revenue)} width={barW} height={h} rx={3}
                fill={isFuture ? '#e8c468' : '#334d7a'} opacity={isFuture ? 0.9 : 1}>
                <title>{`${r.month} 売上 ${formatYen(Math.round(r.revenue))} / 稼働率 ${(occupancy(r) * 100).toFixed(1)}%`}</title>
              </rect>
              <text x={x(i)} y={H - 8} textAnchor="middle" fontSize={10} fill={isFuture ? '#a98a2e' : '#64748b'}>
                {monthLabel(r.month)}
              </text>
            </g>
          )
        })}
        <polyline points={linePoints} fill="none" stroke="#10b981" strokeWidth={2} />
        {rows.map((r, i) => (
          <circle key={r.month} cx={x(i)} cy={yOcc(occupancy(r))} r={2.5} fill="#10b981" />
        ))}
      </svg>
    </div>
  )
}

/** 施設別の売上構成（横棒） */
function FacilityShare({ facilities, past }: { facilities: Facility[]; past: MonthlyKpi[] }) {
  const totals = facilities.map(f => ({
    facility: f,
    kpi: sumKpi(past.map(p => p.byFacility[f.id]).filter(Boolean)),
  })).sort((a, b) => b.kpi.revenue - a.kpi.revenue)
  const max = Math.max(1, ...totals.map(t => t.kpi.revenue))
  const all = totals.reduce((s, t) => s + t.kpi.revenue, 0)

  return (
    <div className="space-y-2">
      {totals.map(({ facility, kpi }) => (
        <div key={facility.id} className="flex items-center gap-3">
          <span className="text-xs text-gray-600 w-32 shrink-0 truncate" title={facility.name}>{facility.name}</span>
          <div className="flex-1 h-5 bg-gray-50 rounded-md overflow-hidden">
            <div className="h-full bg-navy-500/80 rounded-md" style={{ width: `${(kpi.revenue / max) * 100}%` }} />
          </div>
          <span className="text-xs text-gray-700 tabular-nums w-24 text-right">{formatYen(Math.round(kpi.revenue))}</span>
          <span className="text-[11px] text-gray-400 tabular-nums w-20 text-right">
            稼働{(occupancy(kpi) * 100).toFixed(0)}% / {all ? ((kpi.revenue / all) * 100).toFixed(0) : 0}%
          </span>
        </div>
      ))}
    </div>
  )
}

/** 施設×月のマトリクス（指標を切り替えて表示） */
function FacilityMatrix({ facilities, past, future, metric, currentMonth }: {
  facilities: Facility[]; past: MonthlyKpi[]; future: MonthlyKpi[]; metric: MetricKey; currentMonth: string
}) {
  const rows = [...past, ...future]
  const fmt = METRICS.find(m => m.key === metric)!.format
  // 数値の大きさに応じて背景を濃くする
  const values = rows.flatMap(r => facilities.map(f => metricValue(r.byFacility[f.id] ?? ({} as Kpi), metric)))
  const max = Math.max(1, ...values.filter(Number.isFinite))

  return (
    <div className="overflow-x-auto">
      <table className="text-xs border-separate border-spacing-0 min-w-max">
        <thead>
          <tr>
            <th className="sticky left-0 bg-white text-left font-semibold text-gray-500 px-2 py-1.5 border-b border-gray-100">施設</th>
            {rows.map(r => (
              <th key={r.month}
                className={`px-2 py-1.5 font-semibold border-b border-gray-100 text-right whitespace-nowrap ${r.month > currentMonth ? 'text-gold-600' : 'text-gray-500'}`}>
                {shortMonthLabel(r.month)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {facilities.map(f => (
            <tr key={f.id}>
              <td className="sticky left-0 bg-white text-gray-700 px-2 py-1.5 border-b border-gray-50 whitespace-nowrap max-w-[10rem] truncate" title={f.name}>{f.name}</td>
              {rows.map(r => {
                const k = r.byFacility[f.id]
                const v = k ? metricValue(k, metric) : 0
                return (
                  <td key={r.month} className="px-2 py-1.5 border-b border-gray-50 text-right tabular-nums text-gray-700">
                    <span className="inline-block px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: v > 0 ? `rgba(51,77,122,${0.06 + (v / max) * 0.24})` : 'transparent' }}>
                      {v > 0 ? fmt(k) : '—'}
                    </span>
                  </td>
                )
              })}
            </tr>
          ))}
          <tr>
            <td className="sticky left-0 bg-white font-semibold text-gray-700 px-2 py-1.5">合計</td>
            {rows.map(r => (
              <td key={r.month} className={`px-2 py-1.5 text-right tabular-nums font-semibold ${r.month > currentMonth ? 'text-gold-700' : 'text-gray-900'}`}>
                {metricValue(r, metric) > 0 ? fmt(r) : '—'}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  )
}

export function DashboardEmpty() {
  return (
    <div className="p-6 lg:p-8">
      <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-4"><BarChart3 size={24} className="text-navy-600" /> 経営管理</h2>
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        施設がまだ登録されていません。
        <Link href="/dashboard/facilities" className="font-medium hover:underline inline-flex items-center gap-1 ml-1">
          施設管理から登録してください <ArrowRight size={13} />
        </Link>
      </div>
      <p className="text-xs text-gray-400 mt-3 flex items-center gap-1.5">
        <CalendarCheck size={13} /> 予約を同期すると、売上・稼働率・ADRなどが自動で集計されます。
      </p>
    </div>
  )
}
