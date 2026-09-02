'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Sparkles, Plus, Trash2 } from 'lucide-react'

type CleaningStaff = {
  id: string
  name: string
  active: boolean
  created_at: string
}

export function CleaningStaffManager({ initialStaff }: { initialStaff: CleaningStaff[] }) {
  const router = useRouter()
  const [staff, setStaff] = useState<CleaningStaff[]>(initialStaff)
  const [name, setName] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleAdd = async () => {
    if (!name.trim()) { setError('名前を入力してください'); return }
    setAdding(true)
    setError('')
    try {
      const res = await fetch('/api/cleaning-staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? '追加に失敗しました')
        return
      }
      setStaff(prev => [...prev, data])
      setName('')
      router.refresh()
    } catch {
      setError('通信エラーが発生しました。時間をおいて再度お試しください。')
    } finally {
      setAdding(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('この清掃担当者を削除しますか？\n予約への割り当ては解除されます。')) return
    setDeletingId(id)
    setError('')
    try {
      const res = await fetch(`/api/cleaning-staff?id=${id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? '削除に失敗しました')
        return
      }
      setStaff(prev => prev.filter(s => s.id !== id))
      router.refresh()
    } catch {
      setError('通信エラーが発生しました。時間をおいて再度お試しください。')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-gray-500" />
          <h3 className="font-semibold text-gray-900">清掃担当者</h3>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <p className="text-xs text-gray-400 leading-relaxed">
          登録した担当者は、予約一覧の各予約で清掃担当としてプルダウンから選択できます。
        </p>

        {/* 追加フォーム */}
        <div className="flex gap-2">
          <input
            type="text"
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="担当者名（例：山田、清掃業者A）"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
          />
          <Button onClick={handleAdd} loading={adding}>
            <Plus size={15} className="mr-1" /> 追加
          </Button>
        </div>
        {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

        {/* 一覧 */}
        {staff.length > 0 ? (
          <div className="space-y-2">
            {staff.map(s => (
              <div key={s.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-7 h-7 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
                    <Sparkles size={13} className="text-indigo-500" />
                  </span>
                  <span className="text-sm text-gray-700 truncate">{s.name}</span>
                </div>
                <button
                  onClick={() => handleDelete(s.id)}
                  disabled={deletingId === s.id}
                  className="text-gray-400 hover:text-red-500 transition-colors shrink-0 p-1 rounded"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-3">
            清掃担当者が登録されていません。
          </p>
        )}
      </CardContent>
    </Card>
  )
}
