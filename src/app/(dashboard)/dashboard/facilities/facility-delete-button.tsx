'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function FacilityDeleteButton({ facilityId, facilityName }: { facilityId: string; facilityName: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleDelete = async () => {
    setLoading(true)
    setError(null)
    const res = await fetch(`/api/facilities?id=${facilityId}`, { method: 'DELETE' })
    if (res.ok) {
      router.refresh()
      setOpen(false)
    } else {
      const data = await res.json()
      setError(data.error ?? '削除に失敗しました')
    }
    setLoading(false)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 transition-colors py-1 px-2 rounded hover:bg-red-50"
      >
        <Trash2 size={13} />
        施設削除
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-xl shrink-0">
                <AlertTriangle size={20} className="text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">施設を削除しますか？</h3>
                <p className="text-sm text-gray-500 mt-1">
                  <span className="font-medium text-gray-700">「{facilityName}」</span>
                  を削除します。この操作は取り消せません。
                </p>
                <p className="text-xs text-red-600 mt-2 bg-red-50 rounded-lg p-2.5 leading-relaxed">
                  この施設に紐づく<strong>予約・宿泊者名簿・チェックインデータ・アンケート</strong>もすべて削除されます。<br />
                  Beds24 / Airhost・各サイトコントローラー側の予約情報には影響がありません。<br />
                  <strong>連携だけ解除してデータを残したい場合は「連携解除」をご利用ください。</strong>
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
                onClick={handleDelete}
                loading={loading}
                className="bg-red-600 hover:bg-red-700 text-white border-red-600"
              >
                削除する
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
