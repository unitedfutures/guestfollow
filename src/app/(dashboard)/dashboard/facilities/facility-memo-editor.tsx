'use client'

import { useState } from 'react'
import { StickyNote, CheckCircle } from 'lucide-react'

export function FacilityMemoEditor({ facilityId, initialMemo }: { facilityId: string; initialMemo: string }) {
  const [open, setOpen] = useState(false)
  const [memo, setMemo] = useState(initialMemo)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const dirty = memo !== initialMemo

  const handleSave = async () => {
    setSaving(true)
    setError('')
    const res = await fetch('/api/facilities', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: facilityId, memo: memo.trim() || null }),
    })
    if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } else {
      const d = await res.json().catch(() => ({}))
      setError(d.error || '保存に失敗しました')
    }
    setSaving(false)
  }

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* トグルヘッダー */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <StickyNote size={14} className="text-gray-500" />
          <span className="text-sm font-medium text-gray-600">施設メモ</span>
          {initialMemo && (
            <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">記入済み</span>
          )}
        </div>
        <span className="text-xs text-gray-400">{open ? '▲ 閉じる' : '▼ 開く'}</span>
      </button>

      {open && (
        <div className="p-4 space-y-2 bg-white">
          <p className="text-xs text-gray-400 leading-relaxed">
            鍵の場所・ゴミ出し・注意事項など、施設ごとのメモを自由に記入できます。
          </p>
          <textarea
            value={memo}
            onChange={e => setMemo(e.target.value)}
            rows={5}
            placeholder="例：鍵はポスト内。可燃ゴミは火・金の朝。駐車場は建物裏に2台。"
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 resize-y focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent whitespace-pre-wrap"
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving || !dirty}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 transition-colors"
            >
              {saved
                ? <><CheckCircle size={13} /> 保存しました</>
                : saving ? '保存中…' : 'メモを保存'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
