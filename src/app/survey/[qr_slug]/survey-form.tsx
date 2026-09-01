'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CheckCircle, Star, ThumbsUp, ThumbsDown, Copy, ExternalLink } from 'lucide-react'
import { useGuestLang } from '@/lib/i18n/guest-lang'

// ─── 型定義 ───────────────────────────────────────────────────────────────

export type StandardConfig = {
  overall:     boolean
  cleanliness: boolean
  facilities:  boolean
  location:    boolean
  revisit:     boolean
  comment:     boolean
}

export type CustomQuestion = {
  id:   string
  text: string
  type: 'rating' | 'text' | 'yesno'
}

export type SurveyConfig = {
  standard: StandardConfig
  custom:   CustomQuestion[]
  google_review_url?: string   // ☆5のとき案内するGoogleレビューURL
}

// 標準設問の翻訳キー
const STANDARD_KEYS: Record<'overall' | 'cleanliness' | 'facilities' | 'location', string> = {
  overall:     'sv_overall',
  cleanliness: 'sv_cleanliness',
  facilities:  'sv_facilities',
  location:    'sv_location',
}

// ─── 星評価コンポーネント ──────────────────────────────────────────────────

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          className="transition-transform hover:scale-110"
        >
          <Star
            size={28}
            className={`transition-colors ${
              n <= (hover || value)
                ? 'fill-amber-400 text-amber-400'
                : 'text-gray-300'
            }`}
          />
        </button>
      ))}
    </div>
  )
}

// ─── はい・いいえコンポーネント ───────────────────────────────────────────

function YesNoToggle({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useGuestLang()
  return (
    <div className="flex gap-2">
      {(['yes', 'no'] as const).map(v => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
            value === v
              ? v === 'yes'
                ? 'bg-green-100 text-green-700 border-green-300'
                : 'bg-red-50 text-red-600 border-red-200'
              : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
          }`}
        >
          {v === 'yes' ? <ThumbsUp size={14} /> : <ThumbsDown size={14} />}
          {v === 'yes' ? t('yes') : t('no')}
        </button>
      ))}
    </div>
  )
}

// ─── メインフォーム ───────────────────────────────────────────────────────

interface Props {
  qrSlug:          string
  facilityName:    string
  config:          SurveyConfig
  googleReviewUrl?: string
}

export function SurveyForm({ qrSlug, config, googleReviewUrl }: Props) {
  const { t } = useGuestLang()
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // 完了後の分岐用
  const [responseId, setResponseId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [improvement, setImprovement] = useState('')
  const [impSubmitting, setImpSubmitting] = useState(false)
  const [impDone, setImpDone] = useState(false)

  // 回答の状態
  const [answers, setAnswers] = useState<Record<string, number | string>>({})
  const [comment, setComment] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [stayCheckin, setStayCheckin] = useState('')
  const [stayCheckout, setStayCheckout] = useState('')

  const setAnswer = (key: string, val: number | string) =>
    setAnswers(a => ({ ...a, [key]: val }))

  const handleSubmit = async () => {
    // 総合満足度は必須
    if (config.standard.overall && !answers['overall']) {
      setError(t('sv_overall_required'))
      return
    }
    setLoading(true)
    setError('')
    const res = await fetch('/api/survey', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        qr_slug:         qrSlug,
        respondent_name:  name || null,
        respondent_email: email || null,
        stay_checkin:     stayCheckin || null,
        stay_checkout:    stayCheckout || null,
        answers:          { ...answers, comment: comment || null },
      }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error || t('error_generic')); return }
    setResponseId(data.id ?? null)
    setSubmitted(true)
  }

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(comment); setCopied(true); setTimeout(() => setCopied(false), 2500) } catch { /* noop */ }
  }

  const handleImprovement = async () => {
    if (responseId) {
      setImpSubmitting(true)
      await fetch('/api/survey', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: responseId, improvement: improvement || null }),
      }).catch(() => {})
      setImpSubmitting(false)
    }
    setImpDone(true)
  }

  // ─── 送信完了 ─────────────────────────────────────────────────
  if (submitted) {
    const overall = Number(answers['overall']) || 0

    // ☆5：Googleレビュー案内＋感想コピー
    if (overall === 5) {
      return (
        <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100 text-center">
          <div className="flex justify-center gap-0.5 mb-3">
            {[1, 2, 3, 4, 5].map(n => <Star key={n} size={24} className="fill-amber-400 text-amber-400" />)}
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">{t('sv_g_title')}</h3>
          <p className="text-gray-500 text-sm leading-relaxed mb-5">{t('sv_g_desc')}</p>

          {/* 直前の感想を表示＋コピー */}
          <div className="text-left bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
            <p className="text-xs font-semibold text-amber-700 mb-1.5">{t('sv_g_your_comment')}</p>
            {comment ? (
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{comment}</p>
            ) : (
              <p className="text-sm text-gray-400">{t('sv_g_no_comment')}</p>
            )}
            {comment && (
              <button onClick={handleCopy}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-amber-800 bg-white border border-amber-300 rounded-lg px-3 py-1.5 hover:bg-amber-100 transition-colors">
                {copied ? <><CheckCircle size={13} /> {t('sv_g_copied')}</> : <><Copy size={13} /> {t('sv_g_copy')}</>}
              </button>
            )}
          </div>

          {googleReviewUrl && (
            <a href={googleReviewUrl} target="_blank" rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 bg-navy-500 text-white font-bold text-sm px-6 py-3.5 rounded-xl hover:bg-navy-600 transition-colors">
              <ExternalLink size={16} /> {t('sv_g_write')}
            </a>
          )}
          <p className="text-gray-400 text-xs mt-4">{t('sv_thanks_desc')}</p>
        </div>
      )
    }

    // ☆4以下：改善点をヒアリング
    if (overall >= 1 && overall <= 4 && !impDone) {
      return (
        <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-2">{t('sv_imp_title')}</h3>
          <p className="text-gray-500 text-sm leading-relaxed mb-4">{t('sv_imp_desc')}</p>
          <textarea
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            rows={5}
            placeholder={t('sv_imp_ph')}
            value={improvement}
            onChange={e => setImprovement(e.target.value)}
          />
          <div className="flex gap-2 mt-4">
            <Button className="flex-1" size="lg" loading={impSubmitting} onClick={handleImprovement}>
              {t('sv_imp_send')}
            </Button>
            <button onClick={() => setImpDone(true)}
              className="px-4 text-sm text-gray-500 hover:text-gray-700 rounded-lg border border-gray-200">
              {t('sv_imp_close')}
            </button>
          </div>
        </div>
      )
    }

    // 通常の完了（総合満足度なし、または改善点入力後）
    return (
      <div className="bg-white rounded-2xl shadow-sm p-10 border border-gray-100 text-center">
        <CheckCircle size={52} className="text-green-500 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-gray-900 mb-2">{t('sv_thanks_title')}</h3>
        <p className="text-gray-500 text-sm leading-relaxed">{impDone ? t('sv_imp_thanks') : t('sv_thanks_desc')}</p>
      </div>
    )
  }

  const ratingKeys = (['overall', 'cleanliness', 'facilities', 'location'] as const).filter(
    k => config.standard[k]
  )

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 space-y-7">

        {/* 滞在日程（任意） */}
        <div className="bg-gray-50 rounded-xl p-4 space-y-3">
          <p className="text-xs font-medium text-gray-500">{t('sv_stay_period')}</p>
          <div className="grid grid-cols-2 gap-3">
            <Input id="stay_checkin" type="date" label={t('checkin_date')}
              value={stayCheckin} onChange={e => setStayCheckin(e.target.value)} />
            <Input id="stay_checkout" type="date" label={t('checkout_date')}
              value={stayCheckout} onChange={e => setStayCheckout(e.target.value)} />
          </div>
        </div>

        {/* 星評価 */}
        {ratingKeys.length > 0 && (
          <div className="space-y-5">
            {ratingKeys.map(key => (
              <div key={key}>
                <p className="text-sm font-semibold text-gray-800 mb-2">
                  {t(STANDARD_KEYS[key])}
                  {key === 'overall' && <span className="text-red-400 ml-1 text-xs">*</span>}
                </p>
                <StarRating
                  value={(answers[key] as number) || 0}
                  onChange={v => setAnswer(key, v)}
                />
              </div>
            ))}
          </div>
        )}

        {/* またご利用いただけますか */}
        {config.standard.revisit && (
          <div>
            <p className="text-sm font-semibold text-gray-800 mb-2">{t('sv_revisit')}</p>
            <YesNoToggle
              value={(answers['revisit'] as string) || ''}
              onChange={v => setAnswer('revisit', v)}
            />
          </div>
        )}

        {/* カスタム質問（運営者が入力した原文のまま表示） */}
        {config.custom.map(q => (
          <div key={q.id}>
            <p className="text-sm font-semibold text-gray-800 mb-2">{q.text}</p>
            {q.type === 'rating' && (
              <StarRating
                value={(answers[q.id] as number) || 0}
                onChange={v => setAnswer(q.id, v)}
              />
            )}
            {q.type === 'yesno' && (
              <YesNoToggle
                value={(answers[q.id] as string) || ''}
                onChange={v => setAnswer(q.id, v)}
              />
            )}
            {q.type === 'text' && (
              <textarea
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                rows={3}
                placeholder={t('sv_free_ph')}
                value={(answers[q.id] as string) || ''}
                onChange={e => setAnswer(q.id, e.target.value)}
              />
            )}
          </div>
        ))}

        {/* 自由コメント */}
        {config.standard.comment && (
          <div>
            <p className="text-sm font-semibold text-gray-800 mb-2">{t('sv_comment')}</p>
            <textarea
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              rows={4}
              placeholder={t('sv_comment_ph')}
              value={comment}
              onChange={e => setComment(e.target.value)}
            />
          </div>
        )}

        {/* お名前・メール（任意） */}
        <div className="border-t border-gray-100 pt-5 space-y-3">
          <p className="text-xs text-gray-400">{t('sv_contact_note')}</p>
          <div className="grid grid-cols-2 gap-3">
            <Input id="name" label={t('sv_name')} placeholder={t('full_name_ph')}
              value={name} onChange={e => setName(e.target.value)} />
            <Input id="email" type="email" label={t('sv_email')} placeholder={t('email_ph')}
              value={email} onChange={e => setEmail(e.target.value)} />
          </div>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

        <Button className="w-full" size="lg" loading={loading} onClick={handleSubmit}>
          {t('sv_submit')}
        </Button>
      </div>
    </div>
  )
}
