'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Coins, ChevronDown, ChevronLeft, ChevronRight, Wand2, UploadCloud, Save, RefreshCw, Check, AlertTriangle, KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { isJpHoliday, isPreHoliday } from '@/lib/jp-holidays'

type Rules = {
  weekday: number
  saturday: number
  preHoliday: number
  floor: number
  minStayDefault: number
  minStayByDow: Record<string, number>
}
type Facility = { id: string; name: string; beds24_property_id: string | null; pricing_rules: Rules | null; has_refresh?: boolean }
type Room = { roomId: string; name: string; qty: number }
type DayVal = { price: number | null; minStay: number | null }

const DEFAULT_RULES: Rules = {
  weekday: 12000, saturday: 15000, preHoliday: 15000, floor: 10000,
  minStayDefault: 1, minStayByDow: { '0': 1, '1': 1, '2': 1, '3': 1, '4': 1, '5': 1, '6': 1 },
}
const DOW_LABELS = ['日', '月', '火', '水', '木', '金', '土']
const yen = (n: number) => `¥${Math.round(n).toLocaleString('ja-JP')}`
const pad = (n: number) => String(n).padStart(2, '0')
const ymd = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`

export function PricingClient({ facilities }: { facilities: Facility[] }) {
  const [facilityId, setFacilityId] = useState(facilities[0]?.id ?? '')
  const facility = facilities.find(f => f.id === facilityId)
  const [rooms, setRooms] = useState<Room[]>([])
  const [roomId, setRoomId] = useState('')
  const [rules, setRules] = useState<Rules>(facility?.pricing_rules ?? DEFAULT_RULES)
  const [cal, setCal] = useState<Record<string, DayVal>>({})
  // 初期表示：月末付近（残り7日以内）は当月がほぼ過去日で空になるため翌月から表示
  const [month, setMonth] = useState(() => {
    const d = new Date()
    const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
    const base = d.getDate() > daysInMonth - 7 ? new Date(d.getFullYear(), d.getMonth() + 1, 1) : d
    return { y: base.getFullYear(), m: base.getMonth() + 1 }
  })

  const [loadingRooms, setLoadingRooms] = useState(false)
  const [loadingCal, setLoadingCal] = useState(false)
  const [applying, setApplying] = useState(false)
  const [savingRules, setSavingRules] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const monthStart = ymd(month.y, month.m, 1)
  const monthEnd = ymd(month.y, month.m, new Date(month.y, month.m, 0).getDate())

  // 施設変更 → ルール読込＋部屋取得
  useEffect(() => {
    if (!facility) return
    setRules(facility.pricing_rules ?? DEFAULT_RULES)
    setRooms([]); setRoomId(''); setCal({})
    setLoadingRooms(true); setMsg(null)
    fetch(`/api/pricing/rooms?facility_id=${facility.id}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setMsg({ type: 'err', text: d.error }); return }
        setRooms(d.rooms ?? [])
        setRoomId(d.rooms?.[0]?.roomId ?? '')
      })
      .catch(() => setMsg({ type: 'err', text: '部屋情報の取得に失敗しました' }))
      .finally(() => setLoadingRooms(false))
  }, [facilityId]) // eslint-disable-line react-hooks/exhaustive-deps

  // カレンダー読込（Beds24の現在値）
  const loadCalendar = useCallback(() => {
    if (!facility || !roomId) return
    setLoadingCal(true); setMsg(null)
    fetch(`/api/pricing/calendar?facility_id=${facility.id}&room_id=${roomId}&start=${monthStart}&end=${monthEnd}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setMsg({ type: 'err', text: d.error }); return }
        const next: Record<string, DayVal> = {}
        for (const day of d.days ?? []) next[day.date] = { price: day.price ?? null, minStay: day.minStay ?? null }
        setCal(next)
      })
      .catch(() => setMsg({ type: 'err', text: 'カレンダーの取得に失敗しました' }))
      .finally(() => setLoadingCal(false))
  }, [facility, roomId, monthStart, monthEnd])

  useEffect(() => { loadCalendar() }, [loadCalendar])

  // 月の日付一覧
  const days = useMemo(() => {
    const list: { date: string; d: number; dow: number; holiday: boolean; pre: boolean }[] = []
    const total = new Date(month.y, month.m, 0).getDate()
    for (let d = 1; d <= total; d++) {
      const date = ymd(month.y, month.m, d)
      const dow = new Date(Date.UTC(month.y, month.m - 1, d)).getUTCDay()
      list.push({ date, d, dow, holiday: isJpHoliday(date), pre: isPreHoliday(date) })
    }
    return list
  }, [month])

  const autoPriceFor = (date: string, dow: number) => {
    const cat = isPreHoliday(date) ? rules.preHoliday : (dow === 6 ? rules.saturday : rules.weekday)
    return Math.max(Math.round(cat) || 0, Math.round(rules.floor) || 0)
  }
  const autoMinStayFor = (dow: number) => rules.minStayByDow?.[String(dow)] ?? rules.minStayDefault ?? 1

  // 自動プライシングを当月に適用
  const applyAuto = () => {
    const next = { ...cal }
    for (const { date, dow } of days) {
      next[date] = { price: autoPriceFor(date, dow), minStay: autoMinStayFor(dow) }
    }
    setCal(next)
    setMsg({ type: 'ok', text: 'ルールから当月の価格・最低宿泊日数を作成しました。内容を確認して「Beds24へ反映」してください。' })
  }

  const setDay = (date: string, field: keyof DayVal, value: string) => {
    setCal(prev => ({
      ...prev,
      [date]: { ...prev[date], [field]: value === '' ? null : Number(value) },
    }))
  }

  const saveRules = async () => {
    if (!facility) return
    setSavingRules(true)
    await fetch('/api/facilities', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: facility.id, pricing_rules: rules }),
    })
    setSavingRules(false)
    setMsg({ type: 'ok', text: '価格ルールを保存しました。' })
  }

  const filledDays = days.filter(d => cal[d.date] && (cal[d.date].price != null || cal[d.date].minStay != null))

  const applyToBeds24 = async () => {
    if (!facility || !roomId) return
    if (filledDays.length === 0) { setMsg({ type: 'err', text: '反映する価格がありません。先に自動プライシングを適用するか、価格を入力してください。' }); return }
    if (!confirm(`${month.y}年${month.m}月の ${filledDays.length}日分の価格・最低宿泊日数をBeds24に反映します。\nこの操作は実際のOTA掲載価格を更新します。よろしいですか？`)) return

    setApplying(true); setMsg(null)
    const payload = filledDays.map(d => ({ date: d.date, price: cal[d.date].price, minStay: cal[d.date].minStay }))
    const res = await fetch('/api/pricing/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ facility_id: facility.id, room_id: roomId, days: payload }),
    })
    const data = await res.json()
    setApplying(false)
    if (!res.ok) { setMsg({ type: 'err', text: data.error ?? '反映に失敗しました' }); return }
    setMsg({ type: 'ok', text: `Beds24に ${data.updated} 日分を反映しました。反映がOTAに届くまで数分かかる場合があります。` })
    loadCalendar()
  }

  const changeMonth = (delta: number) => {
    setMonth(prev => {
      const d = new Date(prev.y, prev.m - 1 + delta, 1)
      return { y: d.getFullYear(), m: d.getMonth() + 1 }
    })
  }

  if (facilities.length === 0) {
    return (
      <div className="p-6 lg:p-8">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-4"><Coins size={24} className="text-navy-600" /> 宿泊価格</h2>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          Beds24と連携した施設がありません。宿泊価格の設定・反映はBeds24連携施設が対象です（施設管理からBeds24を連携してください）。
        </div>
      </div>
    )
  }

  const leadingBlanks = days.length ? new Date(Date.UTC(month.y, month.m - 1, 1)).getUTCDay() : 0

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Coins size={24} className="text-navy-600" /> 宿泊価格</h2>
        <p className="text-gray-400 text-sm mt-0.5">価格ルールから自動作成し、確認のうえBeds24へ反映します（実際のOTA掲載価格を更新）</p>
      </div>

      {/* 施設・部屋選択 */}
      <div className="bg-white border border-gray-200 rounded-xl p-3 flex flex-wrap items-center gap-2">
        <div className="relative">
          <select value={facilityId} onChange={e => setFacilityId(e.target.value)}
            className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg pl-3 pr-8 py-1.5 appearance-none focus:outline-none focus:ring-2 focus:ring-navy-300 cursor-pointer">
            {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
        {rooms.length > 1 && (
          <div className="relative">
            <select value={roomId} onChange={e => setRoomId(e.target.value)}
              className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg pl-3 pr-8 py-1.5 appearance-none focus:outline-none focus:ring-2 focus:ring-navy-300 cursor-pointer">
              {rooms.map(r => <option key={r.roomId} value={r.roomId}>{r.name}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        )}
        {rooms.length === 1 && <span className="text-xs text-gray-500">部屋：{rooms[0].name}</span>}
        {loadingRooms && <span className="text-xs text-gray-400 flex items-center gap-1"><RefreshCw size={12} className="animate-spin" /> 読込中</span>}
      </div>

      {/* Refresh Token 未設定：反映（書き込み）不可の案内 */}
      {facility && !facility.has_refresh && (
        <div className="flex items-start gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <KeyRound size={16} className="text-amber-500 shrink-0 mt-0.5" />
          <span>
            この施設は<span className="font-semibold">Long Life Token</span>のみが設定されています。価格の<span className="font-semibold">閲覧・自動作成は可能</span>ですが、
            <span className="font-semibold">「Beds24へ反映」（書き込み）にはRefresh Tokenの設定が必要</span>です（Long Life Tokenは読み取り専用）。
            <Link href="/dashboard/settings" className="text-navy-700 hover:underline font-medium">設定 → サイトコントローラー連携</Link>
            から、<span className="font-mono text-xs bg-amber-100 px-1 rounded">write:inventory</span> スコープを含むinvite codeでRefresh Tokenを設定してください。
          </span>
        </div>
      )}

      {/* 価格ルール */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-700 flex items-center gap-1.5"><Wand2 size={15} className="text-navy-600" /> 自動プライシングのルール</p>
          <Button onClick={saveRules} loading={savingRules} variant="outline" className="!py-1.5 text-xs"><Save size={13} /> ルールを保存</Button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {([
            ['平日価格', 'weekday'], ['土曜価格', 'saturday'], ['祝前日価格', 'preHoliday'], ['最低価格（下限）', 'floor'],
          ] as [string, keyof Rules][]).map(([label, key]) => (
            <label key={key} className="block">
              <span className="text-xs text-gray-500">{label}</span>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-gray-400 text-sm">¥</span>
                <input type="number" value={rules[key] as number}
                  onChange={e => setRules(r => ({ ...r, [key]: Number(e.target.value) }))}
                  className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-navy-300" />
              </div>
            </label>
          ))}
        </div>

        {/* 最低宿泊日数 */}
        <div className="mt-4 pt-3 border-t border-gray-100">
          <p className="text-xs font-medium text-gray-600 mb-2">最低宿泊日数（曜日別）</p>
          <div className="flex flex-wrap gap-2">
            {DOW_LABELS.map((lb, i) => (
              <label key={i} className="flex flex-col items-center">
                <span className={`text-[11px] ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-500'}`}>{lb}</span>
                <input type="number" min={1} value={rules.minStayByDow?.[String(i)] ?? rules.minStayDefault}
                  onChange={e => setRules(r => ({ ...r, minStayByDow: { ...r.minStayByDow, [String(i)]: Math.max(1, Number(e.target.value) || 1) } }))}
                  className="w-12 rounded-lg border border-gray-300 px-1 py-1 text-sm text-center mt-0.5 focus:outline-none focus:ring-2 focus:ring-navy-300" />
              </label>
            ))}
            <span className="text-[11px] text-gray-400 self-end pb-1">泊〜</span>
          </div>
        </div>
      </div>

      {/* 月ナビ + アクション */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => changeMonth(-1)} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50"><ChevronLeft size={16} /></button>
          <span className="text-lg font-bold text-gray-900 w-32 text-center">{month.y}年{month.m}月</span>
          <button onClick={() => changeMonth(1)} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50"><ChevronRight size={16} /></button>
          {loadingCal && <RefreshCw size={14} className="text-gray-400 animate-spin" />}
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={applyAuto} variant="outline" className="!py-2 text-sm"><Wand2 size={14} /> 自動プライシングを適用</Button>
          <Button onClick={applyToBeds24} loading={applying} disabled={!facility?.has_refresh}
            title={facility?.has_refresh ? '' : 'Refresh Tokenの設定が必要です'} className="!py-2 text-sm">
            <UploadCloud size={14} /> Beds24へ反映
          </Button>
        </div>
      </div>

      {msg && (
        <p className={`text-sm rounded-lg px-3 py-2 flex items-start gap-1.5 ${msg.type === 'ok' ? 'text-green-700 bg-green-50 border border-green-200' : 'text-red-600 bg-red-50 border border-red-200'}`}>
          {msg.type === 'ok' ? <Check size={15} className="mt-0.5 shrink-0" /> : <AlertTriangle size={15} className="mt-0.5 shrink-0" />}
          <span className="whitespace-pre-line">{msg.text}</span>
        </p>
      )}

      {/* 価格が空の月の案内 */}
      {!loadingCal && Object.keys(cal).length === 0 && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          この月はBeds24から取得できる価格がありません（過去日を含む月や、価格未設定の場合）。翌月（▶）を確認するか、「自動プライシングを適用」で価格を作成できます。
        </p>
      )}

      {/* カレンダー */}
      <div className="bg-white border border-gray-200 rounded-xl p-3 overflow-x-auto">
        <div className="min-w-[700px]">
          <div className="grid grid-cols-7 gap-1.5 mb-1.5">
            {DOW_LABELS.map((lb, i) => (
              <div key={lb} className={`text-center text-xs font-semibold py-1 ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-400'}`}>{lb}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: leadingBlanks }).map((_, i) => <div key={`b${i}`} />)}
            {days.map(({ date, d, dow, holiday, pre }) => {
              const v = cal[date] ?? { price: null, minStay: null }
              const isSat = dow === 6
              const isSun = dow === 0
              return (
                <div key={date} className={`rounded-lg border p-1.5 ${holiday || isSun ? 'border-red-100 bg-red-50/40' : isSat ? 'border-blue-100 bg-blue-50/40' : 'border-gray-100 bg-white'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-bold ${holiday || isSun ? 'text-red-500' : isSat ? 'text-blue-500' : 'text-gray-600'}`}>{d}</span>
                    {pre && <span className="text-[8px] font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded px-0.5">祝前</span>}
                    {holiday && !pre && <span className="text-[8px] font-bold text-red-500 bg-red-50 border border-red-200 rounded px-0.5">祝</span>}
                  </div>
                  <div className="flex items-center gap-0.5">
                    <span className="text-[10px] text-gray-400">¥</span>
                    <input type="number" value={v.price ?? ''} onChange={e => setDay(date, 'price', e.target.value)}
                      placeholder="—"
                      className="w-full text-[11px] text-right rounded border border-gray-200 px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-navy-300" />
                  </div>
                  <div className="flex items-center gap-0.5 mt-0.5">
                    <span className="text-[9px] text-gray-400 shrink-0">最低</span>
                    <input type="number" min={1} value={v.minStay ?? ''} onChange={e => setDay(date, 'minStay', e.target.value)}
                      placeholder="—"
                      className="w-full text-[11px] text-center rounded border border-gray-200 px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-navy-300" />
                    <span className="text-[9px] text-gray-400 shrink-0">泊</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-400 leading-relaxed">
        ※ 「Beds24へ反映」で、表示中の月の価格・最低宿泊日数がBeds24（部屋単位）に書き込まれ、連携中のOTA（Airbnb・Booking.com等）に反映されます。空欄（—）の日は反映されません。
        反映には <span className="font-medium">write:inventory</span> スコープを含むRefresh Tokenの設定が必要です（設定 → サイトコントローラー連携）。
        価格は「¥」の数値、税・サービス料の扱いはBeds24側の設定に従います。
      </p>
    </div>
  )
}
