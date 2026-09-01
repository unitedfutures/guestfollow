'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Unplug, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'

// サイトコントローラー連携のみ解除（施設・予約・名簿などのデータは保持）
export function FacilityDisconnectButton({ facilityId, facilityName }: { facilityId: string; facilityName: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleDisconnect = async () => {
    setLoading(true)
    setError(null)
    const res = await fetch('/api/facilities', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: facilityId,
        beds24_property_id: null,
        airhost_property_id: null,
        ota_account_id: null,
      }),
    })
    if (res.ok) {
      router.refresh()
      setOpen(false)
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? '連携解除に失敗しました')
    }
    setLoading(false)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors py-1 px-2 rounded hover:bg-gray-100"
      >
        <Unplug size={13} />
        連携解除
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 bg-amber-100 rounded-xl shrink-0">
                <Unplug size={20} className="text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">サイトコントローラー連携を解除しますか？</h3>
                <p className="text-sm text-gray-500 mt-1">
                  <span className="font-medium text-gray-700">「{facilityName}」</span>
                  のBeds24 / Airhost連携を解除します。
                </p>
                <p className="text-xs text-gray-600 mt-2 bg-gray-50 border border-gray-200 rounded-lg p-2.5 leading-relaxed">
                  <span className="inline-flex items-center gap-1 font-medium text-green-700"><Info size={12} /> 予約・宿泊者名簿・チェックインデータ・アンケートは<strong>そのまま残ります</strong>。</span><br />
                  以降、この施設への自動同期（予約・メッセージ・売上）は停止します。再び同期したい場合は、施設の基本情報から Property ID を再設定してください。
                </p>
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-600 bg-red-50 rounded-lg p-2.5 mb-4">{error}</p>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                キャンセル
              </Button>
              <Button
                onClick={handleDisconnect}
                loading={loading}
                className="bg-amber-500 hover:bg-amber-600 text-white border-amber-500"
              >
                連携を解除する
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
