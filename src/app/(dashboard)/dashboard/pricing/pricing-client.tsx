'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Coins, ChevronDown, Sliders, ChevronLeft, ChevronRight, Wand2, UploadCloud, Save, RefreshCw, Check, AlertTriangle, KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { isJpHoliday, isPreHoliday } from '@/lib/jp-holidays'
import { BaseSettingsPanel } from './base-settings-panel'

type Rules = {
  weekday: number
  saturday: number
  preHoliday: number
  minStayDefault: number
  minStayByDow: Record<string, number>
}
type Facility = { id: string; name: string; beds24_property_id: string | null; pricing_rules: Rules | null; has_refresh?: boolean }
type Room = { roomId: string; name: string; qty: number }
type DayVal = { price: number | null; minStay: number | null }
type Month = { y: number; m: number }

const DEFAULT_RULES: Rules = {
  weekday: 12000, saturday: 15000, preHoliday: 15000,
  minStayDefault: 1, minStayByDow: { '0': 1, '1': 1, '2': 1, '3': 1, '4': 1, '5': 1, '6': 1 },
}
const DOW_LABELS = ['日', '月', '火', '水', '木', '金', '土']
const pad = (n: number) => String(n).padStart(2, '0')
const ymd = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`
const todayStr = () => { const t = new Date(); return ymd(t.getFullYear(), t.getMonth() + 1, t.getDate()) }
const MAX_RANGE_DAYS = 366
// 開始日〜終了日（YYYY-MM-DD）の日付と曜日を列挙
const eachDate = (start: string, end: string) => {
  const list: { date: string; dow: number }[] = []
  const [y, m, d] = start.split('-').map(Number)
  const cur = new Date(Date.UTC(y, m - 1, d))
  const last = Date.parse(`${end}T00:00:00Z`)
  while (cur.getTime() <= last && list.length <= MAX_RANGE_DAYS) {
    list.push({ date: cur.toISOString().slice(0, 10), dow: cur.getUTCDay() })
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return list
}
const fmtDate = (s: string) => s.replace(/-/g, '/')

export function PricingClient({ facilities }: { facilities: Facility[] }) {
  const [facilityId, setFacilityId] = useState(facilities[0]?.id ?? '')
  const facility = facilities.find(f => f.id === facilityId)
  const [rooms, setRooms] = useState<Room[]>([])
  const [roomId, setRoomId] = useState('')
  const [rules, setRules] = useState<Rules>(facility?.pricing_rules ?? DEFAULT_RULES)
  // cal: 表示中の月のBeds24の現在値 / drafts: まだBeds24へ反映していない変更（月をまたいで保持）
  const [cal, setCal] = useState<Record<string, DayVal>>({})
  const [drafts, setDrafts] = useState<Record<string, DayVal>>({})
  // 初期表示：月末付近（残り7日以内）は当月がほぼ過去日で空になるため翌月から表示
  const [month, setMonth] = useState(() => {
    const d = new Date()
    const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
    const base = d.getDate() > daysInMonth - 7 ? new Date(d.getFullYear(), d.getMonth() + 1, 1) : d
    return { y: base.getFullYear(), m: base.getMonth() + 1 }
  })
  // 料金一括設定の期間（初期値：今日〜表示月の月末）
  const [rangeStart, setRangeStart] = useState(() => {
    const first = ymd(month.y, month.m, 1)
    return first > todayStr() ? first : todayStr()
  })
  const [rangeEnd, setRangeEnd] = useState(() => ymd(month.y, month.m, new Date(month.y, month.m, 0).getDate()))

  const [loadingRooms, setLoadingRooms] = useState(false)
  const [loadingCal, setLoadingCal] = useState(false)
  const [applying, setApplying] = useState(false)
  const [savingRules, setSavingRules] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [showBaseSettings, setShowBaseSettings] = useState(false)

  // カレンダー読込（Beds24の現在値）
  // 施設・部屋・月を引数で受け取り、操作（施設/部屋の切替・月送り）から直接呼ぶ
  const loadCalendar = useCallback(async (fid: string, rid: string, m: Month) => {
    if (!fid || !rid) return
    setLoadingCal(true); setMsg(null)
    const start = ymd(m.y, m.m, 1)
    const end = ymd(m.y, m.m, new Date(m.y, m.m, 0).getDate())
    try {
      const res = await fetch(`/api/pricing/calendar?facility_id=${fid}&room_id=${rid}&start=${start}&end=${end}`)
      const d = await res.json().catch(() => ({}))
      if (d.error) { setMsg({ type: 'err', text: d.error }); return }
      const next: Record<string, DayVal> = {}
      for (const day of d.days ?? []) next[day.date] = { price: day.price ?? null, minStay: day.minStay ?? null }
      setCal(next)
    } catch {
      setMsg({ type: 'err', text: 'カレンダーの取得に失敗しました' })
    } finally {
      setLoadingCal(false)
    }
  }, [])

  // 部屋一覧を取得し、先頭の部屋のカレンダーまで読み込む
  const loadRooms = useCallback(async (fid: string, m: Month) => {
    if (!fid) return
    setLoadingRooms(true); setMsg(null)
    try {
      const res = await fetch(`/api/pricing/rooms?facility_id=${fid}`)
      const d = await res.json().catch(() => ({}))
      if (d.error) { setMsg({ type: 'err', text: d.error }); setRooms([]); setRoomId(''); return }
      const list: Room[] = d.rooms ?? []
      setRooms(list)
      const first = list[0]?.roomId ?? ''
      setRoomId(first)
      if (first) await loadCalendar(fid, first, m)
    } catch {
      setMsg({ type: 'err', text: '部屋情報の取得に失敗しました' })
    } finally {
      setLoadingRooms(false)
    }
  }, [loadCalendar])

  // 初期表示だけは操作の起点がないため effect で外部API（Beds24）を読む
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadRooms(facilityId, month) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 未反映の変更がある状態で施設・部屋を切り替えるときは確認する
  const draftCount = Object.keys(drafts).length
  const confirmDiscard = () =>
    draftCount === 0 || confirm(`Beds24へ未反映の変更が ${draftCount}日分あります。破棄して切り替えますか？`)

  // 施設を切り替える：ルールを読み直し、部屋とカレンダーを取り直す
  const selectFacility = (id: string) => {
    if (!confirmDiscard()) return
    setDrafts({})
    setFacilityId(id)
    const f = facilities.find(x => x.id === id)
    setRules(f?.pricing_rules ?? DEFAULT_RULES)
    setRooms([]); setRoomId(''); setCal({})
    loadRooms(id, month)
  }

  const selectRoom = (id: string) => {
    if (!confirmDiscard()) return
    setDrafts({})
    setRoomId(id)
    loadCalendar(facilityId, id, month)
  }

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
    return Math.round(cat) || 0
  }
  const autoMinStayFor = (dow: number) => rules.minStayByDow?.[String(dow)] ?? rules.minStayDefault ?? 1

  // 料金一括設定：指定期間の価格・最低宿泊日数をルールから作成する（反映は別操作）
  const applyBulk = () => {
    if (!rangeStart || !rangeEnd) { setMsg({ type: 'err', text: '開始日と終了日を選択してください。' }); return }
    if (rangeStart > rangeEnd) { setMsg({ type: 'err', text: '終了日は開始日以降の日付を選択してください。' }); return }
    if (rangeStart < todayStr()) { setMsg({ type: 'err', text: '過去の日付は設定できません。開始日は今日以降を選択してください。' }); return }
    const dates = eachDate(rangeStart, rangeEnd)
    if (dates.length > MAX_RANGE_DAYS) { setMsg({ type: 'err', text: `一度に設定できるのは${MAX_RANGE_DAYS}日分までです。期間を短くしてください。` }); return }

    setDrafts(prev => {
      const next = { ...prev }
      for (const { date, dow } of dates) next[date] = { price: autoPriceFor(date, dow), minStay: autoMinStayFor(dow) }
      return next
    })
    // 表示中の月が期間に含まれなければ、開始日の月へ移動する
    const monthStart = ymd(month.y, month.m, 1)
    const monthEnd = ymd(month.y, month.m, new Date(month.y, month.m, 0).getDate())
    if (rangeEnd < monthStart || rangeStart > monthEnd) {
      const [y, m] = rangeStart.split('-').map(Number)
      setMonth({ y, m })
      loadCalendar(facilityId, roomId, { y, m })
    }
    setMsg({ type: 'ok', text: `${fmtDate(rangeStart)} 〜 ${fmtDate(rangeEnd)} の ${dates.length}日分の価格・最低宿泊日数を作成しました。内容を確認して「Beds24へ反映」してください。` })
  }

  const setDay = (date: string, field: keyof DayVal, value: string) => {
    if (value !== '' && !Number.isFinite(Number(value))) return
    setDrafts(prev => {
      const base = prev[date] ?? cal[date] ?? { price: null, minStay: null }
      return { ...prev, [date]: { ...base, [field]: value === '' ? null : Number(value) } }
    })
  }

  const saveRules = async () => {
    if (!facility) return
    setSavingRules(true)
    setMsg(null)
    try {
      const res = await fetch('/api/facilities', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: facility.id, pricing_rules: rules }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMsg({ type: 'err', text: data.error ?? '価格ルールの保存に失敗しました' })
        return
      }
      setMsg({ type: 'ok', text: '価格ルールを保存しました。' })
    } catch {
      setMsg({ type: 'err', text: '通信エラーが発生しました。時間をおいて再度お試しください。' })
    } finally {
      setSavingRules(false)
    }
  }

  // 反映対象：未反映の変更のうち、値が入っている日（日付順）
  const pendingDays = Object.entries(drafts)
    .filter(([, v]) => v.price != null || v.minStay != null)
    .sort(([a], [b]) => a.localeCompare(b))

  const applyToBeds24 = async () => {
    if (!facility || !roomId) return
    if (pendingDays.length === 0) { setMsg({ type: 'err', text: '反映する変更がありません。先に料金一括設定を行うか、価格を入力してください。' }); return }
    const first = pendingDays[0][0]
    const last = pendingDays[pendingDays.length - 1][0]
    if (!confirm(`${fmtDate(first)} 〜 ${fmtDate(last)} のうち ${pendingDays.length}日分の価格・最低宿泊日数をBeds24に反映します。\nこの操作は実際のOTA掲載価格を更新します。よろしいですか？`)) return

    setApplying(true); setMsg(null)
    const payload = pendingDays.map(([date, v]) => ({ date, price: v.price, minStay: v.minStay }))
    try {
      const res = await fetch('/api/pricing/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ facility_id: facility.id, room_id: roomId, days: payload }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setMsg({ type: 'err', text: data.error ?? '反映に失敗しました' }); return }
      setMsg({ type: 'ok', text: `Beds24に ${data.updated} 日分を反映しました。反映がOTAに届くまで数分かかる場合があります。` })
      setDrafts({})
      loadCalendar(facilityId, roomId, month)
    } catch {
      setMsg({ type: 'err', text: '通信エラーが発生しました。時間をおいて再度お試しください。' })
    } finally {
      setApplying(false)
    }
  }

  const changeMonth = (delta: number) => {
    const d = new Date(month.y, month.m - 1 + delta, 1)
    const next = { y: d.getFullYear(), m: d.getMonth() + 1 }
    setMonth(next)
    loadCalendar(facilityId, roomId, next)
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
          <select value={facilityId} onChange={e => selectFacility(e.target.value)}
            className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg pl-3 pr-8 py-1.5 appearance-none focus:outline-none focus:ring-2 focus:ring-navy-300 cursor-pointer">
            {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
        {rooms.length > 1 && (
          <div className="relative">
            <select value={roomId} onChange={e => selectRoom(e.target.value)}
              className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg pl-3 pr-8 py-1.5 appearance-none focus:outline-none focus:ring-2 focus:ring-navy-300 cursor-pointer">
              {rooms.map(r => <option key={r.roomId} value={r.roomId}>{r.name}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        )}
        {rooms.length === 1 && <span className="text-xs text-gray-500">部屋：{rooms[0].name}</span>}
        {loadingRooms && <span className="text-xs text-gray-400 flex items-center gap-1"><RefreshCw size={12} className="animate-spin" /> 読込中</span>}
        {roomId && (
          <Button variant="outline" onClick={() => setShowBaseSettings(v => !v)}
            className="!py-1.5 text-xs ml-auto">
            <Sliders size={13} /> 基本設定
          </Button>
        )}
      </div>

      {/* 基本設定（Beds24の日別料金のルール） */}
      {showBaseSettings && roomId && facility && (
        <BaseSettingsPanel
          key={`${facilityId}:${roomId}`}
          facilityId={facilityId}
          roomId={roomId}
          roomName={rooms.find(r => r.roomId === roomId)?.name ?? ''}
          canWrite={!!facility.has_refresh}
          onClose={() => setShowBaseSettings(false)}
        />
      )}

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
          <p className="text-sm font-semibold text-gray-700 flex items-center gap-1.5"><Wand2 size={15} className="text-navy-600" /> 料金一括設定のルール</p>
          <Button onClick={saveRules} loading={savingRules} variant="outline" className="!py-1.5 text-xs"><Save size={13} /> ルールを保存</Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {([
            ['平日価格', 'weekday'], ['土曜価格', 'saturday'], ['祝前日価格', 'preHoliday'],
          ] as [string, keyof Rules][]).map(([label, key]) => (
            <label key={key} className="block">
              <span className="text-xs text-gray-500">{label}</span>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-gray-400 text-sm">¥</span>
                <input type="number" value={rules[key] as number}
                  onChange={e => {
                    const n = Number(e.target.value)
                    if (!Number.isFinite(n)) return
                    setRules(r => ({ ...r, [key]: n }))
                  }}
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
                  onChange={e => {
                    const n = Number(e.target.value)
                    if (!Number.isFinite(n)) return
                    setRules(r => ({ ...r, minStayByDow: { ...r.minStayByDow, [String(i)]: Math.max(1, n || 1) } }))
                  }}
                  className="w-12 rounded-lg border border-gray-300 px-1 py-1 text-sm text-center mt-0.5 focus:outline-none focus:ring-2 focus:ring-navy-300" />
              </label>
            ))}
            <span className="text-[11px] text-gray-400 self-end pb-1">泊〜</span>
          </div>
        </div>

        {/* 料金一括設定：期間を選んでルールから作成 */}
        <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-gray-600 mb-2">設定する期間</p>
            <div className="flex flex-wrap items-center gap-2">
              <input type="date" value={rangeStart} min={todayStr()} onChange={e => setRangeStart(e.target.value)}
                aria-label="開始日"
                className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-300" />
              <span className="text-sm text-gray-400">〜</span>
              <input type="date" value={rangeEnd} min={rangeStart || todayStr()} onChange={e => setRangeEnd(e.target.value)}
                aria-label="終了日"
                className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-300" />
              {rangeStart && rangeEnd && rangeStart <= rangeEnd && (
                <span className="text-xs text-gray-400">{eachDate(rangeStart, rangeEnd).length}日間</span>
              )}
            </div>
          </div>
          <Button onClick={applyBulk} variant="outline" className="!py-2 text-sm"><Wand2 size={14} /> 料金一括設定</Button>
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
          {draftCount > 0 && (
            <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">未反映 {draftCount}日分</span>
          )}
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
          この月はBeds24から取得できる価格がありません（過去日を含む月や、価格未設定の場合）。翌月（▶）を確認するか、「料金一括設定」で価格を作成できます。
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
              const v = drafts[date] ?? cal[date] ?? { price: null, minStay: null }
              const isDraft = date in drafts
              // Beds24に登録されている現在の値（入力欄とは別に表示）
              const cur = cal[date]
              const curPrice = cur?.price != null ? `¥${cur.price.toLocaleString()}` : '—'
              const curMinStay = cur?.minStay != null ? `${cur.minStay}泊` : '—'
              const isSat = dow === 6
              const isSun = dow === 0
              return (
                <div key={date} title={isDraft ? 'Beds24へ未反映' : undefined}
                  className={`rounded-lg border p-1.5 ${isDraft ? 'ring-2 ring-amber-300' : ''} ${holiday || isSun ? 'border-red-100 bg-red-50/40' : isSat ? 'border-blue-100 bg-blue-50/40' : 'border-gray-100 bg-white'}`}>
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
                  <div className="mt-1 pt-1 border-t border-dashed border-gray-200 text-[9px] leading-tight text-gray-500"
                    title="Beds24に登録されている現在の価格・最低宿泊日数">
                    <span className="text-gray-400">現在 </span>{curPrice}<span className="text-gray-400"> / </span>{curMinStay}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-400 leading-relaxed">
        ※ 各日の下段「現在」は、Beds24に登録されている現在の価格・最低宿泊日数です。「料金一括設定」や手入力で変更した日（黄色の枠）は、「Beds24へ反映」を押すまでBeds24には送られません。反映すると、月をまたいだ期間でも未反映の日がまとめてBeds24（部屋単位）に書き込まれ、連携中のOTA（Airbnb・Booking.com等）に反映されます。空欄（—）の日は反映されません。
        反映には <span className="font-medium">write:inventory</span> スコープを含むRefresh Tokenの設定が必要です（設定 → サイトコントローラー連携）。
        価格は「¥」の数値、税・サービス料の扱いはBeds24側の設定に従います。
      </p>
    </div>
  )
}
