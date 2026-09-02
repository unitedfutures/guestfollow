'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function AirhostSyncButton({ facilityId }: { facilityId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const handleSync = async () => {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/airhost/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ facility_id: facilityId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setResult({ type: 'err', text: data.error || '同期に失敗しました' })
        return
      }
      setResult({ type: 'ok', text: `${data.synced}件を同期しました` })
      router.refresh()
      setTimeout(() => setResult(null), 4000)
    } catch {
      setResult({ type: 'err', text: '通信エラーが発生しました。時間をおいて再度お試しください。' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative">
      <Button variant="secondary" size="sm" className="w-full" onClick={handleSync} loading={loading}>
        <RefreshCw size={14} className="mr-1.5" /> Airhost同期
      </Button>
      {result && (
        <p className={`absolute -bottom-6 left-0 right-0 text-center text-xs whitespace-nowrap ${
          result.type === 'ok' ? 'text-indigo-600' : 'text-red-600'
        }`}>{result.text}</p>
      )}
    </div>
  )
}
