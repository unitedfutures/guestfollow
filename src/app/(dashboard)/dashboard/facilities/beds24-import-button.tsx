'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Download, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function Beds24ImportButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const handleImport = async () => {
    setLoading(true)
    setResult(null)

    const res = await fetch('/api/beds24/import-facilities', { method: 'POST' })
    const data = await res.json()

    if (res.ok) {
      const msg = data.imported > 0
        ? `${data.imported}件の施設を同期しました${data.skipped > 0 ? `（${data.skipped}件はすでに登録済み）` : ''}`
        : `新規施設はありませんでした（${data.skipped}件は登録済み）`
      setResult({ type: 'success', message: msg })
      router.refresh()
    } else {
      setResult({ type: 'error', message: data.error || 'エラーが発生しました' })
    }

    setLoading(false)
    setTimeout(() => setResult(null), 5000)
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Button variant="outline" onClick={handleImport} loading={loading}>
        <Download size={16} className="mr-1.5" />
        Beds24から施設を同期
      </Button>
      {result && (
        <div className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg
          ${result.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {result.type === 'success'
            ? <CheckCircle size={13} />
            : <AlertCircle size={13} />
          }
          {result.message}
        </div>
      )}
    </div>
  )
}
