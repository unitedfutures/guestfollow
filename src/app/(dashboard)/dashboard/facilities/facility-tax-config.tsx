'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Coins, ChevronDown, Plus, Trash2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TAX_PRESETS, type AccommodationTax, type TaxTier } from '@/lib/tax/accommodation-tax'

const yen = (n: number) => `¥${Math.round(n).toLocaleString('ja-JP')}`

export function FacilityTaxConfig({
  facilityId, initial,
}: { facilityId: string; initial: AccommodationTax | null }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [enabled, setEnabled] = useState(initial?.enabled ?? false)
  const [type, setType] = useState<'tiered' | 'percent'>(
    initial && initial.enabled && initial.type === 'percent' ? 'percent' : 'tiered'
  )
  const [label, setLabel] = useState(initial && initial.enabled ? (initial.label ?? '') : '')
  const [percent, setPercent] = useState(
    initial && initial.enabled && initial.type === 'percent' ? initial.percent : 2
  )
  const [tiers, setTiers] = useState<TaxTier[]>(
    initial && initial.enabled && initial.type === 'tiered'
      ? initial.tiers
      : [{ upTo: 10000, amount: 0 }, { upTo: 15000, amount: 100 }, { upTo: null, amount: 200 }]
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const applyPreset = (key: string) => {
    const p = TAX_PRESETS.find(x => x.key === key)
    if (!p || !p.config.enabled) return
    setEnabled(true)
    setType(p.config.type)
    setLabel(p.config.label ?? '')
    if (p.config.type === 'tiered') setTiers(p.config.tiers)
    if (p.config.type === 'percent') setPercent(p.config.percent)
  }

  const updateTier = (i: number, field: 'upTo' | 'amount', v: string) => {
    setTiers(prev => prev.map((t, idx) => {
      if (idx !== i) return t
      if (field === 'upTo') return { ...t, upTo: v === '' ? null : Number(v) }
      return { ...t, amount: Number(v) || 0 }
    }))
  }
  const addTier = () => setTiers(prev => {
    const withoutTop = prev.filter(t => t.upTo !== null)
    const top = prev.find(t => t.upTo === null) ?? { upTo: null, amount: 0 }
    return [...withoutTop, { upTo: 20000, amount: 200 }, top]
  })
  const removeTier = (i: number) => setTiers(prev => prev.filter((_, idx) => idx !== i))

  const buildConfig = (): AccommodationTax => {
    if (!enabled) return { enabled: false }
    if (type === 'percent') return { enabled: true, type: 'percent', label: label.trim(), percent: Number(percent) || 0 }
    // tiered: upToの昇順（null=最後）に整列
    const sorted = [...tiers].sort((a, b) => {
      if (a.upTo === null) return 1
      if (b.upTo === null) return -1
      return a.upTo - b.upTo
    })
    return { enabled: true, type: 'tiered', label: label.trim(), tiers: sorted }
  }

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    await fetch('/api/facilities', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: facilityId, accommodation_tax: buildConfig() }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    router.refresh()
  }

  return (
    <div className="border-t border-gray-100">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-1 py-3 text-sm text-gray-700 hover:text-gray-900"
      >
        <span className="flex items-center gap-2 font-medium">
          <Coins size={16} className="text-gray-500" /> 宿泊税の設定
          {enabled
            ? <span className="text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 rounded px-1.5 py-0.5">設定済み{label ? `：${label}` : ''}</span>
            : <span className="text-[10px] font-bold text-gray-400 bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5">未設定</span>}
        </span>
        <ChevronDown size={16} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="pb-4 space-y-3">
          {/* ON/OFF */}
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} className="rounded" />
            この施設で宿泊税を計算する
          </label>

          {enabled && (
            <>
              {/* プリセット */}
              <div>
                <p className="text-xs font-medium text-gray-600 mb-1">自治体プリセット</p>
                <div className="flex flex-wrap gap-1.5">
                  {TAX_PRESETS.map(p => (
                    <button key={p.key} onClick={() => applyPreset(p.key)}
                      className="text-xs text-navy-700 bg-navy-50 border border-navy-200 rounded-lg px-2 py-1 hover:bg-navy-100">
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ラベル・方式 */}
              <div className="flex flex-wrap gap-2">
                <input value={label} onChange={e => setLabel(e.target.value)} placeholder="自治体名（例：東京都）"
                  className="flex-1 min-w-[10rem] rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-300" />
                <div className="relative">
                  <select value={type} onChange={e => setType(e.target.value as 'tiered' | 'percent')}
                    className="text-sm bg-gray-50 border border-gray-200 rounded-lg pl-3 pr-8 py-1.5 appearance-none focus:outline-none focus:ring-2 focus:ring-navy-300">
                    <option value="tiered">段階定額（円/人泊）</option>
                    <option value="percent">定率（%）</option>
                  </select>
                  <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* 定率 */}
              {type === 'percent' && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600">宿泊料の</span>
                  <input type="number" step="0.1" value={percent} onChange={e => setPercent(Number(e.target.value))}
                    className="w-20 rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-navy-300" />
                  <span className="text-gray-600">%</span>
                </div>
              )}

              {/* 段階定額 */}
              {type === 'tiered' && (
                <div className="space-y-1.5">
                  <p className="text-xs text-gray-500">1人1泊あたりの宿泊料に応じた税額（円/人泊）。上限は空欄で「以上すべて」。</p>
                  {tiers.map((t, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500 text-xs w-16 text-right">
                        {i === 0 ? '〜' : yen(tiers[i - 1].upTo ?? 0)}
                      </span>
                      <span className="text-gray-400">〜</span>
                      <input type="number" value={t.upTo ?? ''} onChange={e => updateTier(i, 'upTo', e.target.value)}
                        placeholder="上限なし"
                        className="w-24 rounded-lg border border-gray-300 px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-navy-300" />
                      <span className="text-gray-400">円未満 →</span>
                      <input type="number" value={t.amount} onChange={e => updateTier(i, 'amount', e.target.value)}
                        className="w-20 rounded-lg border border-gray-300 px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-navy-300" />
                      <span className="text-gray-500 text-xs">円/人泊</span>
                      <button onClick={() => removeTier(i)} className="text-gray-300 hover:text-red-500" aria-label="削除"><Trash2 size={13} /></button>
                    </div>
                  ))}
                  <button onClick={addTier} className="inline-flex items-center gap-1 text-xs text-navy-600 hover:text-navy-800">
                    <Plus size={12} /> 段階を追加
                  </button>
                </div>
              )}
            </>
          )}

          <div className="flex items-center gap-2 pt-1">
            <Button onClick={handleSave} loading={saving} className="!py-1.5 text-sm">保存</Button>
            {saved && <span className="text-xs text-green-600 flex items-center gap-1"><Check size={14} /> 保存しました</span>}
          </div>
        </div>
      )}
    </div>
  )
}
