'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Star, MessageSquare, Sparkles, RefreshCw, Check, AlertTriangle, Send, ChevronDown, MapPin,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDateTime } from '@/lib/utils'

export type ReviewRow = {
  id: string
  facility_id: string
  facility_name: string
  reviewer_name: string | null
  reviewer_photo_url: string | null
  star_rating: number | null
  comment: string | null
  review_create_time: string | null
  reply_comment: string | null
  reply_update_time: string | null
}

type Props = {
  reviews: ReviewRow[]
  facilities: { id: string; name: string; linked: boolean }[]
  connected: boolean
}

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Star key={n} size={13} className={n <= value ? 'fill-amber-400 text-amber-400' : 'text-gray-200'} />
      ))}
    </span>
  )
}

export function ReviewsClient({ reviews: initial, facilities, connected }: Props) {
  const [reviews, setReviews] = useState(initial)
  const [facilityId, setFacilityId] = useState('all')
  const [onlyUnreplied, setOnlyUnreplied] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const filtered = useMemo(() => reviews.filter(r =>
    (facilityId === 'all' || r.facility_id === facilityId) &&
    (!onlyUnreplied || !r.reply_comment)
  ), [reviews, facilityId, onlyUnreplied])

  const stats = useMemo(() => {
    const target = facilityId === 'all' ? reviews : reviews.filter(r => r.facility_id === facilityId)
    const rated = target.filter(r => r.star_rating)
    const avg = rated.length ? rated.reduce((s, r) => s + (r.star_rating ?? 0), 0) / rated.length : 0
    return { total: target.length, avg, unreplied: target.filter(r => !r.reply_comment).length }
  }, [reviews, facilityId])

  const sync = async () => {
    setSyncing(true); setMsg(null)
    try {
      const res = await fetch('/api/google/reviews/sync', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setMsg({ type: 'err', text: data.error ?? '取り込みに失敗しました' }); return }
      const errors: string[] = data.errors ?? []
      setMsg({
        type: errors.length ? 'err' : 'ok',
        text: errors.length
          ? `${data.synced}件を取り込みましたが、エラーがあります：${errors.join(' / ')}`
          : `${data.synced}件のクチコミを取り込みました。画面を再読み込みすると最新になります。`,
      })
      if (!errors.length) window.location.reload()
    } catch {
      setMsg({ type: 'err', text: '通信エラーが発生しました。時間をおいて再度お試しください。' })
    } finally {
      setSyncing(false)
    }
  }

  const updateReview = (id: string, patch: Partial<ReviewRow>) =>
    setReviews(list => list.map(r => (r.id === id ? { ...r, ...patch } : r)))

  const linkedCount = facilities.filter(f => f.linked).length

  return (
    <div className="p-6 lg:p-8 space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Star size={24} className="text-amber-500" /> Googleクチコミ
          </h2>
          <p className="text-gray-400 text-sm mt-0.5">
            Googleビジネスプロフィールのクチコミを確認し、返信できます
          </p>
        </div>
        <Button onClick={sync} loading={syncing} disabled={!connected || linkedCount === 0} className="!py-2 text-sm">
          <RefreshCw size={14} /> クチコミを取り込む
        </Button>
      </div>

      {(!connected || linkedCount === 0) && (
        <div className="flex items-start gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
          <span>
            {!connected
              ? <>Googleビジネスプロフィールと連携されていません。</>
              : <>Googleの店舗と紐づいた施設がありません。</>}
            <Link href="/dashboard/facilities" className="text-navy-700 hover:underline font-medium mx-1">施設管理</Link>
            の「Googleビジネスプロフィール連携」から設定してください。
          </span>
        </div>
      )}

      {/* 集計 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">クチコミ数</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">平均評価</p>
          <p className="text-2xl font-bold text-amber-600 mt-1 flex items-center gap-2">
            {stats.avg ? stats.avg.toFixed(2) : '—'}
            {stats.avg > 0 && <Stars value={Math.round(stats.avg)} />}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">未返信</p>
          <p className={`text-2xl font-bold mt-1 ${stats.unreplied > 0 ? 'text-red-600' : 'text-gray-900'}`}>{stats.unreplied}</p>
        </div>
      </div>

      {/* 絞り込み */}
      <div className="bg-white border border-gray-200 rounded-xl p-3 flex flex-wrap items-center gap-3">
        <div className="relative">
          <select value={facilityId} onChange={e => setFacilityId(e.target.value)}
            className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg pl-3 pr-8 py-1.5 appearance-none focus:outline-none focus:ring-2 focus:ring-navy-300 cursor-pointer">
            <option value="all">すべての施設</option>
            {facilities.map(f => <option key={f.id} value={f.id}>{f.name}{f.linked ? '' : '（未連携）'}</option>)}
          </select>
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
        <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
          <input type="checkbox" checked={onlyUnreplied} onChange={e => setOnlyUnreplied(e.target.checked)}
            className="rounded border-gray-300" />
          未返信のみ
        </label>
        <span className="text-xs text-gray-400 ml-auto">{filtered.length} 件表示</span>
      </div>

      {msg && (
        <p className={`text-sm rounded-lg px-3 py-2 flex items-start gap-1.5 ${
          msg.type === 'ok' ? 'text-green-700 bg-green-50 border border-green-200' : 'text-red-600 bg-red-50 border border-red-200'
        }`}>
          {msg.type === 'ok' ? <Check size={15} className="mt-0.5 shrink-0" /> : <AlertTriangle size={15} className="mt-0.5 shrink-0" />}
          <span className="whitespace-pre-line">{msg.text}</span>
        </p>
      )}

      {filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map(r => <ReviewCard key={r.id} review={r} onUpdate={updateReview} />)}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl text-center py-16">
          <MessageSquare size={40} className="mx-auto mb-3 text-gray-200" />
          <p className="text-sm text-gray-500 font-medium">表示するクチコミがありません</p>
          <p className="text-xs text-gray-400 mt-1">「クチコミを取り込む」で最新の状態にできます</p>
        </div>
      )}
    </div>
  )
}

function ReviewCard({ review, onUpdate }: {
  review: ReviewRow
  onUpdate: (id: string, patch: Partial<ReviewRow>) => void
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(review.reply_comment ?? '')
  const [suggesting, setSuggesting] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const suggest = async () => {
    setSuggesting(true); setError('')
    try {
      const res = await fetch('/api/google/reviews/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ review_id: review.id }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setError(data.error ?? '返信案の作成に失敗しました'); return }
      setDraft(data.text)
    } catch {
      setError('通信エラーが発生しました。時間をおいて再度お試しください。')
    } finally {
      setSuggesting(false)
    }
  }

  const send = async () => {
    if (!draft.trim()) return
    if (!confirm('この内容でGoogleに返信します。投稿後はGoogleのクチコミ欄に公開されます。よろしいですか？')) return
    setSending(true); setError('')
    try {
      const res = await fetch('/api/google/reviews/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ review_id: review.id, comment: draft.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setError(data.error ?? '返信に失敗しました'); return }
      onUpdate(review.id, { reply_comment: draft.trim(), reply_update_time: new Date().toISOString() })
      setOpen(false)
    } catch {
      setError('通信エラーが発生しました。時間をおいて再度お試しください。')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-900">{review.reviewer_name || '匿名'}</span>
            {review.star_rating ? <Stars value={review.star_rating} /> : null}
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <MapPin size={11} /> {review.facility_name}
            </span>
          </div>
          {review.review_create_time && (
            <p className="text-[11px] text-gray-400 mt-0.5">{formatDateTime(review.review_create_time)}</p>
          )}
        </div>
        <span className={`text-xs font-medium rounded-full px-2 py-0.5 border shrink-0 ${
          review.reply_comment
            ? 'text-green-700 bg-green-50 border-green-200'
            : 'text-red-600 bg-red-50 border-red-200'
        }`}>
          {review.reply_comment ? '返信済み' : '未返信'}
        </span>
      </div>

      {review.comment && (
        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap mt-3 bg-gray-50 rounded-lg px-3 py-2">
          {review.comment}
        </p>
      )}

      {review.reply_comment && !open && (
        <div className="mt-3 border-l-2 border-navy-200 pl-3">
          <p className="text-[11px] font-semibold text-navy-700 mb-0.5">
            返信済み{review.reply_update_time ? `（${formatDateTime(review.reply_update_time)}）` : ''}
          </p>
          <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{review.reply_comment}</p>
        </div>
      )}

      {!open ? (
        <div className="mt-3 flex justify-end">
          <Button variant="outline" onClick={() => setOpen(true)} className="!py-1.5 text-xs">
            <MessageSquare size={12} /> {review.reply_comment ? '返信を編集' : '返信する'}
          </Button>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-gray-600">返信内容</p>
            <button onClick={suggest} disabled={suggesting}
              className="text-xs text-amber-700 hover:text-amber-900 inline-flex items-center gap-1 disabled:opacity-50">
              <Sparkles size={12} className={suggesting ? 'animate-pulse' : ''} />
              {suggesting ? '作成中…' : 'AIで返信案を作る'}
            </button>
          </div>
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            rows={5}
            maxLength={4096}
            placeholder="クチコミへの返信を入力（AIで下書きを作れます）"
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-navy-300 resize-none"
          />
          <p className="text-[11px] text-gray-400">
            AIの返信案は、クチコミの内容と施設の設備・サービス、アンケートでよく挙がる魅力をもとに作成します。送信前に必ずご確認ください。
          </p>
          {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => { setOpen(false); setDraft(review.reply_comment ?? ''); setError('') }}
              disabled={sending} className="!py-1.5 text-xs">キャンセル</Button>
            <Button onClick={send} loading={sending} disabled={!draft.trim()} className="!py-1.5 text-xs">
              <Send size={12} /> Googleに返信を投稿
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
