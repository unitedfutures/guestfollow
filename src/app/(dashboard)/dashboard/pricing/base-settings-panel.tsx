'use client'

import { useCallback, useEffect, useState } from 'react'
import { Sliders, RefreshCw, UploadCloud, Check, AlertTriangle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

export type BaseSettings = {
  basePeople: number
  extraPersonPrice: number
  minNights: number
  maxNights: number
  minAdvance: number
  maxAdvance: number
  fixedPriceId: number | null
  fixedPriceName: string | null
  roomMaxPeople: number
}

type NumKey = 'basePeople' | 'extraPersonPrice' | 'minNights' | 'maxNights' | 'minAdvance' | 'maxAdvance'

const FIELDS: { key: NumKey; label: string; unit: string; hint: string; min: number; max: number }[] = [
  { key: 'basePeople', label: '基本人数', unit: '名', hint: '基本料金に含まれる人数。0で部屋の定員を使用', min: 0, max: 99 },
  { key: 'extraPersonPrice', label: '人数追加料金', unit: '円', hint: '基本人数を超える1名・1泊あたりの追加料金', min: 0, max: 10_000_000 },
  { key: 'minNights', label: '最低宿泊日数', unit: '泊', hint: 'これより短い泊数は予約を受け付けない', min: 0, max: 99 },
  { key: 'maxNights', label: '最大宿泊日数', unit: '泊', hint: 'これより長い泊数は予約を受け付けない', min: 1, max: 365 },
  { key: 'minAdvance', label: 'チェックインまでの日数（最短）', unit: '日', hint: '何日後以降のチェックインを受け付けるか。0で制限なし', min: 0, max: 999 },
  { key: 'maxAdvance', label: 'チェックインまでの日数（最長）', unit: '日', hint: '何日先までのチェックインを受け付けるか。0で制限なし', min: 0, max: 999 },
]

export function BaseSettingsPanel({
  facilityId, roomId, roomName, canWrite, onClose,
}: {
  facilityId: string
  roomId: string
  roomName: string
  canWrite: boolean
  onClose: () => void
}) {
  const [settings, setSettings] = useState<BaseSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)
  const [allowCreate, setAllowCreate] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // 開いた時点でBeds24の現在値を読み込む（初期値として表示する）
  const load = useCallback(async () => {
    setLoading(true); setMsg(null)
    try {
      const res = await fetch(`/api/pricing/base-settings?facility_id=${facilityId}&room_id=${roomId}`)
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setMsg({ type: 'err', text: d.error ?? '基本設定の取得に失敗しました' }); return }
      setSettings(d.settings)
    } catch {
      setMsg({ type: 'err', text: '通信エラーが発生しました。時間をおいて再度お試しください。' })
    } finally {
      setLoading(false)
    }
  }, [facilityId, roomId])

  // 開いた直後の読み込みだけは操作の起点がないため effect で外部API（Beds24）を読む
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [load])

  const setValue = (key: NumKey, value: string) => {
    if (value !== '' && !Number.isFinite(Number(value))) return
    setSettings(s => (s ? { ...s, [key]: value === '' ? 0 : Number(value) } : s))
  }

  const apply = async () => {
    if (!settings) return
    const isNew = !settings.fixedPriceId
    const confirmText = isNew
      ? `Beds24に「日別料金」の設定が無いため、新しく作成して基本設定を書き込みます。\n作成した設定はGuestFollowからは削除できません（Beds24の画面で削除してください）。\nよろしいですか？`
      : `Beds24の「${settings.fixedPriceName || '日別料金'}」の基本設定を更新します。\nこの操作は実際のOTAの予約条件に影響します。よろしいですか？`
    if (!confirm(confirmText)) return

    setApplying(true); setMsg(null)
    try {
      const res = await fetch('/api/pricing/base-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facility_id: facilityId, room_id: roomId,
          fixed_price_id: settings.fixedPriceId, allow_create: isNew ? allowCreate : false,
          settings: {
            basePeople: settings.basePeople, extraPersonPrice: settings.extraPersonPrice,
            minNights: settings.minNights, maxNights: settings.maxNights,
            minAdvance: settings.minAdvance, maxAdvance: settings.maxAdvance,
          },
        }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setMsg({ type: 'err', text: d.error ?? '基本設定の反映に失敗しました' }); return }
      // 反映後の値を読み直してから結果を表示する（load が表示をクリアするため順序が大事）
      await load()
      setMsg({ type: 'ok', text: d.created ? 'Beds24に日別料金を作成し、基本設定を反映しました。' : 'Beds24の基本設定を更新しました。' })
    } catch {
      setMsg({ type: 'err', text: '通信エラーが発生しました。時間をおいて再度お試しください。' })
    } finally {
      setApplying(false)
    }
  }

  const isNew = !!settings && !settings.fixedPriceId

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
          <Sliders size={15} className="text-navy-600" /> 基本設定
          <span className="font-normal text-xs text-gray-400">（{roomName}）</span>
        </p>
        <div className="flex items-center gap-2">
          <button onClick={load} disabled={loading}
            className="text-xs text-gray-500 hover:text-navy-600 flex items-center gap-1 disabled:opacity-50">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> 再読込
          </button>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="閉じる">
            <X size={16} />
          </button>
        </div>
      </div>

      {loading && !settings ? (
        <p className="text-sm text-gray-400 flex items-center gap-1.5 py-2">
          <RefreshCw size={13} className="animate-spin" /> Beds24から現在の設定を読み込んでいます
        </p>
      ) : settings ? (
        <>
          <p className="text-xs text-gray-400 mb-3">
            Beds24の「{settings.fixedPriceName || '日別料金'}」の設定です。値はBeds24から読み込んでいます
            {settings.roomMaxPeople > 0 && <>（この部屋の定員：{settings.roomMaxPeople}名）</>}。
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {FIELDS.map(f => (
              <label key={f.key} className="block">
                <span className="text-xs text-gray-600">{f.label}</span>
                <div className="flex items-center gap-1 mt-1">
                  <input type="number" min={f.min} max={f.max} value={settings[f.key]}
                    onChange={e => setValue(f.key, e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-navy-300" />
                  <span className="text-xs text-gray-400 shrink-0">{f.unit}</span>
                </div>
                <span className="block text-[11px] text-gray-400 mt-0.5 leading-snug">{f.hint}</span>
              </label>
            ))}
          </div>

          {isNew && (
            <div className="mt-4 flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
              <AlertTriangle size={14} className="shrink-0 mt-0.5 text-amber-500" />
              <div className="space-y-1.5">
                <p>
                  この部屋にはBeds24の「日別料金」の設定がありません。反映すると<span className="font-semibold">新しく作成</span>されます。
                  価格自体は今までどおりカレンダーの値を使います（新しい設定では価格を有効にしません）。
                </p>
                <p>作成した設定はGuestFollowからは削除できません。削除はBeds24の画面（価格 → 日別料金詳細設定）で行ってください。</p>
                <label className="flex items-center gap-1.5 font-medium">
                  <input type="checkbox" checked={allowCreate} onChange={e => setAllowCreate(e.target.checked)}
                    className="rounded border-amber-300" />
                  上記を理解しました
                </label>
              </div>
            </div>
          )}

          {!canWrite && (
            <p className="mt-3 text-xs text-amber-700">
              反映には書き込み権限付きのトークン（Refresh Token）の設定が必要です。
            </p>
          )}

          <div className="mt-4 flex justify-end">
            <Button onClick={apply} loading={applying}
              disabled={!canWrite || (isNew && !allowCreate)}
              className="!py-2 text-sm">
              <UploadCloud size={14} /> Beds24へ反映
            </Button>
          </div>
        </>
      ) : null}

      {msg && (
        <p className={`mt-3 text-sm rounded-lg px-3 py-2 flex items-start gap-1.5 ${msg.type === 'ok' ? 'text-green-700 bg-green-50 border border-green-200' : 'text-red-600 bg-red-50 border border-red-200'}`}>
          {msg.type === 'ok' ? <Check size={15} className="mt-0.5 shrink-0" /> : <AlertTriangle size={15} className="mt-0.5 shrink-0" />}
          <span className="whitespace-pre-line">{msg.text}</span>
        </p>
      )}
    </div>
  )
}
