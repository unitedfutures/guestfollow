'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  MessageSquare, RefreshCw, Send, Search, ChevronLeft,
  CircleUser, CalendarDays, AlertCircle,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { ChannelBadge } from '@/components/dashboard/channel-badge'

type Message = {
  id: string
  booking_id: string
  facility_id: string
  ota_source: string
  direction: 'incoming' | 'outgoing'
  source: string | null
  body: string
  sent_at: string
  read: boolean
}

type Booking = {
  id: string
  guest_name: string | null
  guest_email: string | null
  checkin_date: string
  checkout_date: string
  ota_source: string | null
  ota_channel: string | null
  facility_id: string
  facilities: { name: string } | null
}

type ThreadMessage = {
  id: string
  direction: 'incoming' | 'outgoing'
  source: string | null
  body: string
  sent_at: string
  read: boolean
  ota_source: string
}

interface Props {
  initialMessages: Message[]
  bookings: Booking[]
  refreshFacilityIds: string[]
}

function OtaBadge({ source }: { source: string | null }) {
  if (source === 'beds24') return <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5">Beds24</span>
  if (source === 'airhost') return <span className="text-[10px] font-bold text-purple-600 bg-purple-50 border border-purple-200 rounded px-1.5 py-0.5">Airhost</span>
  return null
}

function timeLabel(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  if (sameDay) return d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })
}

export function MessagesClient({ initialMessages, bookings, refreshFacilityIds }: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [thread, setThread] = useState<ThreadMessage[]>([])
  const [threadLoading, setThreadLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncNote, setSyncNote] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')

  const bookingMap = useMemo(() => {
    const m = new Map<string, Booking>()
    bookings.forEach(b => m.set(b.id, b))
    return m
  }, [bookings])

  // 会話一覧（予約単位に集約、最新メッセージ順）
  const conversations = useMemo(() => {
    const byBooking = new Map<string, { last: Message; unread: number }>()
    for (const m of messages) {
      const cur = byBooking.get(m.booking_id)
      if (!cur) {
        byBooking.set(m.booking_id, { last: m, unread: m.direction === 'incoming' && !m.read ? 1 : 0 })
      } else {
        if (new Date(m.sent_at) > new Date(cur.last.sent_at)) cur.last = m
        if (m.direction === 'incoming' && !m.read) cur.unread++
      }
    }
    let list = Array.from(byBooking.entries()).map(([bookingId, v]) => ({
      bookingId,
      last: v.last,
      unread: v.unread,
      booking: bookingMap.get(bookingId),
    }))
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter(c => {
        const b = c.booking
        return (
          (b?.guest_name ?? '').toLowerCase().includes(q) ||
          (b?.facilities?.name ?? '').toLowerCase().includes(q) ||
          c.last.body.toLowerCase().includes(q)
        )
      })
    }
    list.sort((a, b) => new Date(b.last.sent_at).getTime() - new Date(a.last.sent_at).getTime())
    return list
  }, [messages, bookingMap, search])

  const totalUnread = conversations.reduce((s, c) => s + c.unread, 0)
  const selectedBooking = selectedId ? bookingMap.get(selectedId) : null

  const loadThread = async (bookingId: string) => {
    setSelectedId(bookingId)
    setThreadLoading(true)
    setSendError('')
    const res = await fetch(`/api/messages/${bookingId}`)
    const data = await res.json()
    setThread(Array.isArray(data) ? data : [])
    setThreadLoading(false)
    // 既読化をローカルにも反映
    setMessages(prev => prev.map(m =>
      m.booking_id === bookingId && m.direction === 'incoming' ? { ...m, read: true } : m
    ))
  }

  const handleSync = async () => {
    setSyncing(true)
    setSyncNote(null)
    const res = await fetch('/api/messages/sync', { method: 'POST' })
    const data = await res.json()
    if (res.ok) {
      setSyncNote(data.synced > 0 ? `${data.synced}件のメッセージを取り込みました` : '新着メッセージはありません')
      // 再読込
      const listRes = await fetch('/api/messages')
      const list = await listRes.json()
      setMessages(Array.isArray(list) ? list : [])
      if (selectedId) loadThread(selectedId)
    } else {
      setSyncNote(data.error ?? '同期に失敗しました')
    }
    setSyncing(false)
    setTimeout(() => setSyncNote(null), 6000)
  }

  const handleSend = async () => {
    if (!draft.trim() || !selectedId) return
    setSending(true)
    setSendError('')
    const res = await fetch(`/api/messages/${selectedId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: draft.trim() }),
    })
    const data = await res.json()
    if (res.ok) {
      setThread(prev => [...prev, data.message])
      setMessages(prev => [data.message
        ? { ...data.message, booking_id: selectedId, facility_id: selectedBooking?.facility_id ?? '' }
        : null, ...prev].filter(Boolean) as Message[])
      setDraft('')
    } else {
      setSendError(data.error ?? '送信に失敗しました')
    }
    setSending(false)
  }

  const isBeds24 = selectedBooking?.ota_source === 'beds24'
  const hasRefresh = !!selectedBooking && refreshFacilityIds.includes(selectedBooking.facility_id)
  const canSend = isBeds24 && hasRefresh

  return (
    <div className="p-6 lg:p-8">
      {/* ヘッダー */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            メッセージ
            {totalUnread > 0 && (
              <span className="ml-2 text-xs font-bold text-white bg-red-500 rounded-full px-2 py-0.5 align-middle">
                {totalUnread}
              </span>
            )}
          </h2>
          <p className="text-gray-400 text-sm mt-0.5">Beds24・Airhostのゲストメッセージ</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-white bg-navy-600 rounded-lg px-3 py-2 hover:bg-navy-700 disabled:opacity-60 transition-colors"
          >
            <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
            {syncing ? '同期中…' : 'メッセージを同期'}
          </button>
          {syncNote && <span className="text-xs text-gray-500 bg-gray-50 rounded px-2 py-1">{syncNote}</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-0 bg-white border border-gray-200 rounded-xl overflow-hidden min-h-[560px]">

        {/* ── 会話一覧 ── */}
        <div className={`border-r border-gray-100 flex flex-col ${selectedId ? 'hidden lg:flex' : 'flex'}`}>
          <div className="p-3 border-b border-gray-100">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="ゲスト名・施設・本文で検索"
                className="w-full text-sm bg-gray-50 border border-gray-200 rounded-lg pl-8 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy-300"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
            {conversations.length > 0 ? conversations.map(c => {
              const b = c.booking
              const active = c.bookingId === selectedId
              return (
                <button
                  key={c.bookingId}
                  onClick={() => loadThread(c.bookingId)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${active ? 'bg-navy-50/50' : ''}`}
                >
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-sm font-semibold text-gray-900 truncate">
                        {b?.guest_name ?? '（名称未取得）'}
                      </span>
                      <ChannelBadge channel={b?.ota_channel ?? null} />
                      <OtaBadge source={c.last.ota_source} />
                    </div>
                    <span className="text-[11px] text-gray-400 shrink-0">{timeLabel(c.last.sent_at)}</span>
                  </div>
                  <p className="text-xs text-gray-400 truncate mb-1">{b?.facilities?.name}</p>
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-xs truncate ${c.unread > 0 ? 'text-gray-800 font-medium' : 'text-gray-400'}`}>
                      {c.last.direction === 'outgoing' && <span className="text-gray-300">↩ </span>}
                      {c.last.body}
                    </p>
                    {c.unread > 0 && (
                      <span className="shrink-0 text-[10px] font-bold text-white bg-red-500 rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
                        {c.unread}
                      </span>
                    )}
                  </div>
                </button>
              )
            }) : (
              <div className="text-center py-16 px-4 text-gray-400">
                <MessageSquare size={40} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">メッセージがありません</p>
                <p className="text-xs mt-1">「メッセージを同期」でBeds24から取り込んでください</p>
              </div>
            )}
          </div>
        </div>

        {/* ── スレッド ── */}
        <div className={`flex flex-col ${selectedId ? 'flex' : 'hidden lg:flex'}`}>
          {selectedBooking ? (
            <>
              {/* スレッドヘッダー */}
              <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-3">
                <button onClick={() => setSelectedId(null)} className="lg:hidden text-gray-400">
                  <ChevronLeft size={18} />
                </button>
                <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                  <CircleUser size={20} className="text-gray-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-gray-900 truncate">
                      {selectedBooking.guest_name ?? '（名称未取得）'}
                    </span>
                    <ChannelBadge channel={selectedBooking.ota_channel} />
                    <OtaBadge source={selectedBooking.ota_source} />
                  </div>
                  <p className="text-xs text-gray-400 flex items-center gap-1">
                    <CalendarDays size={10} />
                    {selectedBooking.facilities?.name} ／ {formatDate(selectedBooking.checkin_date)}〜{formatDate(selectedBooking.checkout_date)}
                  </p>
                </div>
              </div>

              {/* 送信欄（最上部） */}
              <div className="border-b border-gray-100 p-3">
                {canSend ? (
                  <>
                    <div className="flex items-end gap-2">
                      <textarea
                        value={draft}
                        onChange={e => setDraft(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleSend() }
                        }}
                        rows={2}
                        placeholder="メッセージを入力（⌘+Enterで送信）"
                        className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-navy-300"
                      />
                      <button
                        onClick={handleSend}
                        disabled={sending || !draft.trim()}
                        className="shrink-0 inline-flex items-center gap-1.5 bg-navy-600 text-white text-sm font-medium rounded-lg px-4 py-2.5 hover:bg-navy-700 disabled:opacity-50 transition-colors"
                      >
                        <Send size={14} />
                        {sending ? '送信中' : '送信'}
                      </button>
                    </div>
                    {sendError && <p className="text-xs text-red-600 mt-2">{sendError}</p>}
                  </>
                ) : isBeds24 && !hasRefresh ? (
                  <div className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
                    <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                    <span>
                      メッセージ送信には<span className="font-semibold">Refresh Tokenの設定</span>が必要です（Long Life Tokenは読み取り専用のため送信できません）。
                      <Link href="/dashboard/settings" className="text-navy-600 hover:underline font-medium">設定 → サイトコントローラー連携</Link>
                      から、write権限付きのRefresh Tokenを設定してください。
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2.5">
                    <AlertCircle size={14} className="text-gray-400 shrink-0" />
                    この予約への返信は現在対応していません（Beds24のOTA予約のみ送信可能）
                  </div>
                )}
              </div>

              {/* メッセージ本文（新しい順：上が最新・下が古い） */}
              <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-gray-50/50">
                {threadLoading ? (
                  <div className="flex justify-center py-10">
                    <div className="w-6 h-6 border-2 border-navy-400 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : thread.length > 0 ? [...thread].reverse().map(m => (
                  <div key={m.id} className={`flex ${m.direction === 'outgoing' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                      m.direction === 'outgoing'
                        ? 'bg-navy-600 text-white rounded-br-sm'
                        : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>
                      <p className={`text-[10px] mt-1 ${m.direction === 'outgoing' ? 'text-navy-200' : 'text-gray-400'}`}>
                        {new Date(m.sent_at).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                )) : (
                  <p className="text-center text-sm text-gray-400 py-10">まだメッセージがありません</p>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-300 p-8">
              <MessageSquare size={56} className="mb-4 opacity-40" />
              <p className="text-sm text-gray-400">会話を選択してください</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
