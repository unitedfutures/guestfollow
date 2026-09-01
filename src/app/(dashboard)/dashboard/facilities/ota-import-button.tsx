'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Download, CheckCircle, AlertCircle, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'

type OtaAccount = {
  id: string
  provider: 'beds24' | 'airhost'
  label: string
}

const PROVIDER_LABELS = { beds24: 'Beds24', airhost: 'Airhost' }

export function OtaImportButton({ accounts }: { accounts: OtaAccount[] }) {
  const router = useRouter()
  const [selectedId, setSelectedId] = useState<string>(accounts[0]?.id ?? '')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  if (accounts.length === 0) {
    return (
      <p className="text-xs text-gray-400 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
        設定ページでサイトコントローラーを追加してください
      </p>
    )
  }

  const selectedAccount = accounts.find(a => a.id === selectedId) ?? accounts[0]

  const handleImport = async () => {
    if (!selectedId) return
    setLoading(true)
    setResult(null)

    const endpoint = selectedAccount.provider === 'beds24'
      ? '/api/beds24/import-facilities'
      : '/api/airhost/import-facilities'

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account_id: selectedId }),
    })
    const data = await res.json()

    if (res.ok) {
      const msg = data.imported > 0
        ? `${data.imported}件の施設をインポートしました${data.skipped > 0 ? `（${data.skipped}件は登録済み）` : ''}`
        : `新規施設はありませんでした（${data.skipped}件は登録済み）`
      setResult({ type: 'success', message: msg })
      router.refresh()
    } else {
      setResult({ type: 'error', message: data.error || 'エラーが発生しました' })
    }

    setLoading(false)
    setTimeout(() => setResult(null), 6000)
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-1.5 items-center">
        {/* アカウント選択（複数ある場合） */}
        {accounts.length > 1 && (
          <div className="relative">
            <select
              value={selectedId}
              onChange={e => setSelectedId(e.target.value)}
              className="appearance-none rounded-lg border border-gray-300 bg-white pl-3 pr-7 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {accounts.map(a => (
                <option key={a.id} value={a.id}>
                  {PROVIDER_LABELS[a.provider]}：{a.label || 'アカウント'}
                </option>
              ))}
            </select>
            <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        )}

        <Button variant="outline" onClick={handleImport} loading={loading}>
          <Download size={16} className="mr-1.5" />
          {accounts.length === 1
            ? `${PROVIDER_LABELS[selectedAccount.provider]}から施設をインポート`
            : '施設をインポート'
          }
        </Button>
      </div>

      {result && (
        <div className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg
          ${result.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {result.type === 'success' ? <CheckCircle size={13} /> : <AlertCircle size={13} />}
          {result.message}
        </div>
      )}
    </div>
  )
}
