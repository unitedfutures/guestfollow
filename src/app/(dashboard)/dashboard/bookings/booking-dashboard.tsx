'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  CalendarDays, Users, CheckCircle2, XCircle, AlertTriangle, AlertCircle,
  ClipboardList, Filter, ChevronDown, Building2, MessageSquare,
  ArrowUpDown, Fingerprint, Search, RefreshCw, Copy, Send, Globe,
  ChevronRight, Sparkles,
} from 'lucide-react'
import { formatDate, formatDateTime } from '@/lib/utils'
import { BookingForm } from './booking-form'
import { CsvDownloadButton } from './csv-download-button'
import { OtaChannelBadge } from '@/components/dashboard/channel-badge'

// ─── 型 ────────────────────────────────────────────────────────────────────

type GuestRecord = {
  id: string
  full_name: string
  email: string
  phone: string | null
  address: string | null
  num_guests: number
  is_foreign: boolean
  nationality: string | null
  checkin_completed_at: string | null
  terms_agreed_at: string | null
}

type Booking = {
  id: string
  guest_name: string | null
  guest_email: string | null
  checkin_date: string
  checkout_date: string
  num_guests: number
  status: string
  ota_source: string | null
  ota_channel: string | null
  ota_status: string | null
  cleaning_staff_id: string | null
  created_at: string
  facility_id: string
  pre_checkin_token: string
  facilities: { id: string; name: string } | null
  guest_records: GuestRecord[] | GuestRecord | null
}

type Facility = { id: string; name: string }
type SurveyResponse = { id: string; facility_id: string; stay_checkin: string | null }
type CleaningStaff = { id: string; name: string }

interface Props {
  bookings: Booking[]
  facilities: Facility[]
  surveyResponses: SurveyResponse[]
  cleaningStaff: CleaningStaff[]
  appUrl: string
  cleanerMode?: boolean
}

// ─── ユーティリティ ──────────────────────────────────────────────────────────

function getGuestRecords(b: Booking): GuestRecord[] {
  if (!b.guest_records) return []
  return Array.isArray(b.guest_records) ? b.guest_records : [b.guest_records]
}

function hasSurvey(b: Booking, surveys: SurveyResponse[]): boolean {
  return surveys.some(
    s => s.facility_id === b.facility_id && s.stay_checkin === b.checkin_date
  )
}

function isUpcoming(date: string) {
  return new Date(date) >= new Date(new Date().toDateString())
}

function isThisWeek(date: string) {
  const d = new Date(date)
  const today = new Date()
  const next7 = new Date()
  next7.setDate(today.getDate() + 7)
  return d >= new Date(today.toDateString()) && d <= next7
}

function isToday(date: string) {
  return new Date(date).toDateString() === new Date().toDateString()
}

// ─── ステータスバッジ ─────────────────────────────────────────────────────────

function StatusBadge({ ok, label, pending }: { ok: boolean; label: string; pending?: boolean }) {
  if (ok) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5 whitespace-nowrap">
        <CheckCircle2 size={10} /> {label}
      </span>
    )
  }
  if (pending) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-400 bg-gray-50 border border-gray-200 rounded-full px-2 py-0.5 whitespace-nowrap">
        — {label}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-full px-2 py-0.5 whitespace-nowrap">
      <XCircle size={10} /> {label}未
    </span>
  )
}

// ─── 一括同期ボタン ──────────────────────────────────────────────────────────

function SyncAllButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSync = async () => {
    setLoading(true)
    setMessage(null)
    try {
      const res = await fetch('/api/bookings/sync-all', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error ?? '同期に失敗しました' })
        return
      }
      const hasErrors = Array.isArray(data.errors) && data.errors.length > 0
      const errNote = hasErrors ? `（一部エラー: ${data.errors.join(' / ')}）` : ''
      setMessage({
        type: hasErrors ? 'error' : 'success',
        text: data.synced > 0
          ? `${data.synced}件の新規予約を同期しました${errNote}`
          : `新規予約はありません${errNote}`,
      })
      router.refresh()
      // 成功時のみ自動で消す（エラーは次の操作まで残す）
      if (!hasErrors) setTimeout(() => setMessage(null), 8000)
    } catch {
      setMessage({ type: 'error', text: '通信エラーが発生しました。時間をおいて再度お試しください。' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        onClick={handleSync}
        disabled={loading}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-white bg-navy-600 rounded-lg px-3 py-2 hover:bg-navy-700 disabled:opacity-60 transition-colors"
      >
        <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        {loading ? '同期中…' : '予約を同期'}
      </button>
      {message && (
        <span className={`text-xs px-2 py-1 rounded ${
          message.type === 'success' ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'
        }`}>
          {message.text}
        </span>
      )}
    </div>
  )
}

// ─── 展開パネル（予約詳細＋アクション） ────────────────────────────────────────

function BookingDetail({ booking, appUrl }: { booking: Booking & { hasRecord: boolean }; appUrl: string }) {
  const [copied, setCopied] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [resendError, setResendError] = useState('')

  // ゲストメッセージ送信
  const [msgBody, setMsgBody] = useState('')
  const [msgSending, setMsgSending] = useState(false)
  const [msgResult, setMsgResult] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const canMessage = booking.ota_source === 'beds24'

  const preCheckinUrl = `${appUrl}/pre-checkin/${booking.pre_checkin_token}`
  const record = getGuestRecords(booking)[0]

  const handleCopy = async () => {
    await navigator.clipboard.writeText(preCheckinUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const handleResend = async () => {
    setSending(true)
    setResendError('')
    try {
      const res = await fetch(`/api/bookings/${booking.id}/resend`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setResendError(data.error ?? 'メールの送信に失敗しました')
        return
      }
      setSent(true)
      setTimeout(() => setSent(false), 3000)
    } catch {
      setResendError('通信エラーが発生しました。時間をおいて再度お試しください。')
    } finally {
      setSending(false)
    }
  }

  const handleSendMessage = async () => {
    if (!msgBody.trim()) return
    setMsgSending(true)
    setMsgResult(null)
    try {
      const res = await fetch(`/api/messages/${booking.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: msgBody.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMsgResult({ type: 'error', text: data.error ?? '送信に失敗しました' })
        return
      }
      setMsgBody('')
      setMsgResult({ type: 'success', text: 'メッセージを送信しました' })
      setTimeout(() => setMsgResult(null), 6000)
    } catch {
      setMsgResult({ type: 'error', text: '通信エラーが発生しました。時間をおいて再度お試しください。' })
    } finally {
      setMsgSending(false)
    }
  }

  return (
    <div className="px-5 pb-4 pt-1 bg-gray-50/70 border-t border-gray-100">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* ── 左：事前登録URL＋アクション ── */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500">この予約の宿泊者登録URL（ゲストに送付）</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-white border border-gray-200 rounded-lg px-3 py-2 truncate text-gray-600 font-mono">
              {preCheckinUrl}
            </code>
            <button
              onClick={handleCopy}
              className={`shrink-0 inline-flex items-center gap-1 text-xs font-medium rounded-lg px-3 py-2 border transition-colors ${
                copied
                  ? 'text-green-700 bg-green-50 border-green-200'
                  : 'text-gray-600 bg-white border-gray-200 hover:bg-gray-50'
              }`}
            >
              {copied ? <CheckCircle2 size={12} /> : <Copy size={12} />}
              {copied ? 'コピー済み' : 'コピー'}
            </button>
          </div>
          <div className="flex items-center gap-2">
            {booking.guest_email && (
              <button
                onClick={handleResend}
                disabled={sending}
                className={`inline-flex items-center gap-1 text-xs font-medium rounded-lg px-3 py-1.5 border transition-colors ${
                  sent
                    ? 'text-green-700 bg-green-50 border-green-200'
                    : 'text-indigo-600 bg-indigo-50 border-indigo-200 hover:bg-indigo-100'
                }`}
              >
                <Send size={12} />
                {sent ? '送信しました' : sending ? '送信中…' : `登録案内メールを送る（${booking.guest_email}）`}
              </button>
            )}
          </div>
          {resendError && (
            <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{resendError}</p>
          )}
        </div>

        {/* ── 右：登録済み宿泊者情報 ── */}
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-gray-500">登録済みの宿泊者情報</p>
          {record ? (
            <div className="bg-white border border-gray-200 rounded-lg px-3 py-2.5 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-gray-800">{record.full_name}</span>
                {record.is_foreign && (
                  <span className="inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-50 rounded-full px-2 py-0.5">
                    <Globe size={10} /> {record.nationality}
                  </span>
                )}
                <span className="text-xs text-gray-400">{record.num_guests}名</span>
              </div>
              {(record.address || record.phone) && (
                <p className="text-xs text-gray-500">
                  {[record.address, record.phone].filter(Boolean).join(' ／ ')}
                </p>
              )}
              {record.email && <p className="text-xs text-gray-400">{record.email}</p>}
              {record.checkin_completed_at && (
                <p className="text-xs text-green-600">
                  チェックイン: {formatDateTime(record.checkin_completed_at)}
                </p>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-white border border-dashed border-gray-300 rounded-lg px-3 py-3 text-xs text-gray-400">
              <AlertTriangle size={13} className="text-red-400" />
              未登録です。上のURLをゲストに送って登録を依頼してください。
            </div>
          )}
        </div>

      </div>

      {/* ── ゲストへのメッセージ送信 ── */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1.5">
          <MessageSquare size={12} /> このゲストにメッセージを送る
        </p>
        {canMessage ? (
          <>
            <div className="flex items-end gap-2">
              <textarea
                value={msgBody}
                onChange={e => setMsgBody(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleSendMessage() } }}
                rows={2}
                placeholder="メッセージを入力（⌘+Enterで送信）"
                className="flex-1 text-sm bg-white border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-navy-300"
              />
              <button
                onClick={handleSendMessage}
                disabled={msgSending || !msgBody.trim()}
                className="shrink-0 inline-flex items-center gap-1.5 bg-navy-600 text-white text-sm font-medium rounded-lg px-4 py-2.5 hover:bg-navy-700 disabled:opacity-50 transition-colors"
              >
                <Send size={14} />
                {msgSending ? '送信中' : '送信'}
              </button>
            </div>
            {msgResult && (
              <p className={`text-xs mt-1.5 ${msgResult.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                {msgResult.text}
              </p>
            )}
            <p className="text-[11px] text-gray-400 mt-1">Beds24経由でゲストのOTAメッセージとして送信されます。送信内容はメッセージ画面のスレッドにも表示されます。</p>
          </>
        ) : (
          <div className="flex items-center gap-2 bg-white border border-dashed border-gray-300 rounded-lg px-3 py-2.5 text-xs text-gray-400">
            <AlertCircle size={13} className="text-gray-400 shrink-0" />
            この予約への送信は現在対応していません（Beds24のOTA予約のみ送信可能）
          </div>
        )}
      </div>
    </div>
  )
}

// ─── メインコンポーネント ────────────────────────────────────────────────────

export function BookingDashboard({ bookings, facilities, surveyResponses, cleaningStaff, appUrl, cleanerMode = false }: Props) {
  const gridCols = cleanerMode
    ? 'lg:grid-cols-[2fr_1.5fr_1.4fr_1fr]'
    : 'lg:grid-cols-[16px_2fr_1.5fr_1.2fr_1fr_0.9fr_0.9fr_0.9fr]'
  const [facilityFilter, setFacilityFilter] = useState<string>('all')
  const [periodFilter, setPeriodFilter] = useState<string>('upcoming')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchText, setSearchText] = useState('')
  const [sortAsc, setSortAsc] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  // 予約ID → 清掃担当者ID のローカル上書き（割り当て変更を即時反映）
  const [cleaningMap, setCleaningMap] = useState<Record<string, string | null>>({})
  const [cleaningError, setCleaningError] = useState('')

  const assignCleaning = async (bookingId: string, staffId: string | null) => {
    // 失敗時に戻せるよう、変更前の値を退避
    const hadEntry = bookingId in cleaningMap
    const prevValue = cleaningMap[bookingId]
    const revert = () => setCleaningMap(prev => {
      const next = { ...prev }
      if (hadEntry) next[bookingId] = prevValue
      else delete next[bookingId]
      return next
    })
    setCleaningMap(prev => ({ ...prev, [bookingId]: staffId }))
    setCleaningError('')
    try {
      const res = await fetch(`/api/bookings/${bookingId}/cleaning`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cleaning_staff_id: staffId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        revert()
        setCleaningError(data.error ?? '清掃担当者の割り当てに失敗しました')
      }
    } catch {
      revert()
      setCleaningError('通信エラーが発生しました。時間をおいて再度お試しください。')
    }
  }

  // キャンセル予約は一覧・件数・サマリーのすべてから除外する（売上レポートには表示）
  const activeBookings = useMemo(
    () => bookings.filter(b => b.ota_status !== 'cancelled'),
    [bookings]
  )

  // ── フィルタリング ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = activeBookings
      .map(b => {
        const records = getGuestRecords(b)
        const hasRecord = records.length > 0
        const checkedIn = records.some(r => r.checkin_completed_at)
        const surveyed = hasSurvey(b, surveyResponses)
        return { ...b, hasRecord, checkedIn, surveyed }
      })

    // 施設フィルター
    if (facilityFilter !== 'all') {
      list = list.filter(b => b.facility_id === facilityFilter)
    }

    // チェックイン日の範囲フィルター（指定時は期間フィルターより優先）
    const hasDateRange = dateFrom || dateTo
    if (hasDateRange) {
      if (dateFrom) list = list.filter(b => b.checkin_date >= dateFrom)
      if (dateTo) list = list.filter(b => b.checkin_date <= dateTo)
    } else if (periodFilter === 'upcoming') {
      list = list.filter(b => isUpcoming(b.checkin_date))
    } else if (periodFilter === 'past') {
      list = list.filter(b => !isUpcoming(b.checkin_date))
    }

    // ステータスフィルター
    if (statusFilter === 'no_record') {
      list = list.filter(b => !b.hasRecord)
    } else if (statusFilter === 'no_checkin') {
      list = list.filter(b => b.hasRecord && !b.checkedIn)
    } else if (statusFilter === 'no_survey') {
      list = list.filter(b => !b.surveyed)
    }

    // テキスト検索（ゲスト名・メール・登録名）
    const q = searchText.trim().toLowerCase()
    if (q) {
      list = list.filter(b => {
        const record = getGuestRecords(b)[0]
        return (
          (b.guest_name ?? '').toLowerCase().includes(q) ||
          (b.guest_email ?? '').toLowerCase().includes(q) ||
          (record?.full_name ?? '').toLowerCase().includes(q)
        )
      })
    }

    // ソート
    list.sort((a, b) => {
      const da = new Date(a.checkin_date).getTime()
      const db = new Date(b.checkin_date).getTime()
      return sortAsc ? da - db : db - da
    })

    return list
  }, [activeBookings, facilityFilter, periodFilter, dateFrom, dateTo, statusFilter, searchText, sortAsc, surveyResponses])

  // ── サマリー数値（キャンセルを除いた予約が対象） ──────────────────────────
  const todayArrivals = activeBookings.filter(b => isToday(b.checkin_date)).length
  const weekArrivals = activeBookings.filter(b => isThisWeek(b.checkin_date)).length
  const noRecordUpcoming = activeBookings.filter(b => {
    const records = getGuestRecords(b)
    return isUpcoming(b.checkin_date) && records.length === 0
  }).length

  const stats = [
    {
      label: '今日のチェックイン',
      value: todayArrivals,
      icon: CalendarDays,
      color: todayArrivals > 0 ? 'text-navy-600 bg-navy-50 border-navy-200' : 'text-gray-400 bg-gray-50 border-gray-200',
      action: () => { setPeriodFilter('upcoming'); setFacilityFilter('all'); setStatusFilter('all') },
    },
    {
      label: '今週の到着予定',
      value: weekArrivals,
      icon: Users,
      color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
      action: () => { setPeriodFilter('upcoming'); setFacilityFilter('all'); setStatusFilter('all') },
    },
    {
      label: '名簿未登録（今後）',
      value: noRecordUpcoming,
      icon: AlertTriangle,
      color: noRecordUpcoming > 0 ? 'text-red-600 bg-red-50 border-red-200' : 'text-gray-400 bg-gray-50 border-gray-200',
      action: () => { setPeriodFilter('upcoming'); setFacilityFilter('all'); setStatusFilter('no_record') },
    },
  ]

  return (
    <div className="p-6 lg:p-8 space-y-6">

      {/* ── ヘッダー ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{cleanerMode ? '清掃予定' : '予約一覧'}</h2>
          <p className="text-gray-400 text-sm mt-0.5">全 {activeBookings.length} 件（キャンセルを除く）</p>
        </div>
        {!cleanerMode && (
          <div className="flex items-center gap-2">
            <CsvDownloadButton />
            <BookingForm facilities={facilities} />
            <SyncAllButton />
          </div>
        )}
      </div>

      {/* ── サマリーカード ───────────────────────────────────────────────── */}
      {!cleanerMode && (
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {stats.map(({ label, value, icon: Icon, color, action }) => (
          <button
            key={label}
            onClick={action}
            className={`flex items-center gap-2 sm:gap-3 px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl border text-left transition-shadow hover:shadow-sm ${color}`}
          >
            <Icon size={16} className="shrink-0 hidden sm:block" />
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs font-medium opacity-80 leading-tight">{label}</p>
              <p className="text-lg sm:text-2xl font-black leading-tight">{value}</p>
            </div>
          </button>
        ))}
      </div>
      )}

      {/* ── フィルターバー ──────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl p-3 flex flex-wrap gap-2 items-center">
        <Filter size={14} className="text-gray-400 shrink-0" />

        {/* 施設フィルター */}
        <div className="relative">
          <select
            value={facilityFilter}
            onChange={e => setFacilityFilter(e.target.value)}
            className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg pl-3 pr-7 py-1.5 appearance-none focus:outline-none focus:ring-2 focus:ring-navy-300 cursor-pointer"
          >
            <option value="all">すべての施設</option>
            {facilities.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>

        {/* 期間フィルター（日付範囲未指定のときのみ有効） */}
        <div className="relative">
          <select
            value={periodFilter}
            onChange={e => setPeriodFilter(e.target.value)}
            disabled={!!(dateFrom || dateTo)}
            className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg pl-3 pr-7 py-1.5 appearance-none focus:outline-none focus:ring-2 focus:ring-navy-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="upcoming">今後（直近・将来）</option>
            <option value="past">過去</option>
            <option value="all">全期間</option>
          </select>
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>

        {/* チェックイン日の範囲フィルター */}
        <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1">
          <CalendarDays size={13} className="text-gray-400 shrink-0" />
          <input
            type="date"
            value={dateFrom}
            max={dateTo || undefined}
            onChange={e => setDateFrom(e.target.value)}
            aria-label="チェックイン日（開始）"
            className="text-sm text-gray-700 bg-transparent focus:outline-none w-[7.5rem]"
          />
          <span className="text-gray-400 text-xs">〜</span>
          <input
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={e => setDateTo(e.target.value)}
            aria-label="チェックイン日（終了）"
            className="text-sm text-gray-700 bg-transparent focus:outline-none w-[7.5rem]"
          />
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { setDateFrom(''); setDateTo('') }}
              className="text-gray-400 hover:text-gray-600 shrink-0"
              aria-label="日付範囲をクリア"
            >
              <XCircle size={14} />
            </button>
          )}
        </div>

        {/* ステータスフィルター */}
        {!cleanerMode && (
        <div className="relative">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg pl-3 pr-7 py-1.5 appearance-none focus:outline-none focus:ring-2 focus:ring-navy-300 cursor-pointer"
          >
            <option value="all">すべてのステータス</option>
            <option value="no_record">名簿未登録</option>
            <option value="no_checkin">チェックイン未</option>
            <option value="no_survey">アンケート未</option>
          </select>
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
        )}

        {/* ゲスト名検索 */}
        <div className="relative flex-1 min-w-[160px]">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            placeholder="ゲスト名・メールで検索"
            className="w-full text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-navy-300"
          />
        </div>

        <span className="text-xs text-gray-400">{filtered.length} 件表示</span>
      </div>

      {cleaningError && (
        <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{cleaningError}</p>
      )}

      {/* ── 予約一覧 ────────────────────────────────────────────────────── */}
      {filtered.length > 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {/* テーブルヘッダー */}
          <div className={`hidden lg:grid ${gridCols} gap-4 px-5 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide`}>
            {!cleanerMode && <div />}
            <div>施設 / OTA</div>
            <button
              className="flex items-center gap-1 hover:text-gray-800 transition-colors text-left"
              onClick={() => setSortAsc(a => !a)}
            >
              チェックイン日 <ArrowUpDown size={11} />
            </button>
            <div>清掃担当者</div>
            <div>ゲスト</div>
            {!cleanerMode && <div className="text-center">名簿</div>}
            {!cleanerMode && <div className="text-center">チェックイン</div>}
            {!cleanerMode && <div className="text-center">アンケート</div>}
          </div>

          {/* 行 */}
          <div className="divide-y divide-gray-200">
            {filtered.map((b, idx) => {
              const todayFlag = isToday(b.checkin_date)
              const expanded = expandedId === b.id
              const rowBg = todayFlag
                ? 'bg-navy-50/40 border-l-[3px] border-l-navy-400'
                : expanded
                  ? 'bg-gray-100'
                  : idx % 2 === 1 ? 'bg-gray-50/60' : 'bg-white'
              return (
                <div key={b.id}>
                  <div
                    role="button"
                    tabIndex={cleanerMode ? -1 : 0}
                    onClick={() => { if (!cleanerMode) setExpandedId(expanded ? null : b.id) }}
                    onKeyDown={e => { if (!cleanerMode && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setExpandedId(expanded ? null : b.id) } }}
                    className={`w-full text-left grid grid-cols-1 ${gridCols} gap-x-4 gap-y-1.5 lg:gap-y-0 px-5 py-2.5 items-center transition-colors ${rowBg} ${
                      cleanerMode ? '' : 'hover:bg-navy-50/40 cursor-pointer'
                    }`}
                  >
                    {/* 展開アイコン */}
                    {!cleanerMode && (
                      <div className="hidden lg:block">
                        <ChevronRight
                          size={14}
                          className={`text-gray-300 transition-transform ${expanded ? 'rotate-90' : ''}`}
                        />
                      </div>
                    )}

                    {/* 施設名 + 予約OTA + サイトコントローラー */}
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-semibold text-gray-900 truncate">
                            {b.facilities?.name ?? '—'}
                          </span>
                          <OtaChannelBadge channel={b.ota_channel} source={b.ota_source} />
                          {todayFlag && (
                            <span className="text-[10px] font-bold text-navy-600 bg-navy-100 rounded px-1.5 py-0.5 shrink-0">TODAY</span>
                          )}
                        </div>
                        {b.guest_email && (
                          <p className="text-xs text-gray-400 truncate mt-0.5 hidden lg:block">{b.guest_email}</p>
                        )}
                      </div>
                    </div>

                    {/* チェックイン〜チェックアウト（1行） */}
                    <div className="text-sm text-gray-700 whitespace-nowrap">
                      <span className="font-medium">{formatDate(b.checkin_date)}</span>
                      <span className="text-gray-400"> 〜 {formatDate(b.checkout_date)}</span>
                    </div>

                    {/* 清掃担当者プルダウン（行の展開を阻害しないよう伝播停止） */}
                    <div onClick={e => e.stopPropagation()} className="flex items-center gap-1.5">
                      <span className="lg:hidden text-xs text-gray-400 shrink-0">清掃担当者:</span>
                      <div className="relative flex-1 lg:flex-none lg:w-full">
                        <select
                          value={cleaningMap[b.id] !== undefined ? (cleaningMap[b.id] ?? '') : (b.cleaning_staff_id ?? '')}
                          onChange={e => assignCleaning(b.id, e.target.value || null)}
                          disabled={cleanerMode}
                          className="w-full text-xs text-gray-700 bg-white border border-gray-200 rounded-lg pl-6 pr-6 py-1.5 appearance-none focus:outline-none focus:ring-2 focus:ring-navy-300 cursor-pointer disabled:bg-gray-50 disabled:cursor-default"
                        >
                          <option value="">未割当</option>
                          {cleaningStaff.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                        <Sparkles size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      </div>
                    </div>

                    {/* ゲスト名・人数（1行） */}
                    <div className="flex items-baseline gap-1.5 min-w-0">
                      <span className="text-sm text-gray-700 truncate">
                        {b.guest_name ?? <span className="text-gray-300">—</span>}
                      </span>
                      <span className="text-xs text-gray-400 shrink-0">{b.num_guests}名</span>
                    </div>

                    {/* 3ステータス：モバイルは横並び1行、デスクトップは各列に展開 */}
                    {!cleanerMode && (
                    <div className="flex flex-wrap items-center gap-1.5 lg:contents">
                      {/* 名簿 */}
                      <div className="flex lg:justify-center">
                        <StatusBadge ok={b.hasRecord} label="名簿" />
                      </div>
                      {/* チェックイン */}
                      <div className="flex lg:justify-center">
                        {b.hasRecord ? (
                          <StatusBadge ok={b.checkedIn} label="チェックイン" />
                        ) : (
                          <StatusBadge ok={false} label="チェックイン" pending />
                        )}
                      </div>
                      {/* アンケート */}
                      <div className="flex lg:justify-center">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium rounded-full px-2 py-0.5 whitespace-nowrap ${
                          b.surveyed
                            ? 'text-green-700 bg-green-50 border border-green-200'
                            : 'text-gray-400 bg-gray-50 border border-gray-200'
                        }`}>
                          {b.surveyed
                            ? <><CheckCircle2 size={10} /> アンケート回答済</>
                            : <><MessageSquare size={10} /> アンケート未回答</>
                          }
                        </span>
                      </div>
                    </div>
                    )}
                  </div>

                  {/* 展開パネル */}
                  {!cleanerMode && expanded && <BookingDetail booking={b} appUrl={appUrl} />}
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl text-center py-20">
          <CalendarDays size={48} className="mx-auto mb-4 text-gray-200" />
          <p className="text-sm text-gray-500 font-medium">該当する予約がありません</p>
          <p className="text-xs text-gray-400 mt-1">フィルターを変更するか、「予約を同期」を実行してください</p>
          <Link
            href="/dashboard/facilities"
            className="inline-flex items-center gap-1.5 mt-4 text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
          >
            <Building2 size={14} /> 施設管理へ
          </Link>
        </div>
      )}

      {/* ── 機能ショートカット ──────────────────────────────────────────── */}
      {!cleanerMode && (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[
          {
            href: '/dashboard/facilities',
            icon: Fingerprint,
            label: 'チェックインQR発行',
            desc: '施設ごとのQRコードを確認・印刷',
            color: 'text-navy-600',
            bg: 'bg-navy-50 border-navy-200 hover:bg-navy-100',
          },
          {
            href: '/dashboard/surveys',
            icon: ClipboardList,
            label: 'アンケート結果',
            desc: '満足度・コメントを一覧確認',
            color: 'text-amber-600',
            bg: 'bg-amber-50 border-amber-200 hover:bg-amber-100',
          },
        ].map(({ href, icon: Icon, label, desc, color, bg }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-start gap-3 p-4 rounded-xl border transition-colors ${bg}`}
          >
            <div className={`p-2 rounded-lg bg-white/60 shrink-0 ${color}`}>
              <Icon size={18} />
            </div>
            <div>
              <p className={`text-sm font-semibold ${color}`}>{label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
            </div>
          </Link>
        ))}
      </div>
      )}
    </div>
  )
}
