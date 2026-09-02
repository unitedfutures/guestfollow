'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Sparkles, Plus, Trash2, Pencil, X, Check, Copy, Send, Loader2, Clock, UserCheck, UserX,
} from 'lucide-react'
import type { AccountStatus, CleaningStaffWithStatus } from '@/lib/cleaning/staff'

type CleaningStaff = CleaningStaffWithStatus
type Facility = { id: string; name: string }

// アカウントの有無を一目で分けるためのバッジ
function StatusBadge({ status }: { status: AccountStatus }) {
  if (status === 'active') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-1.5 py-0.5 whitespace-nowrap">
        <UserCheck size={10} /> アカウント登録済み
      </span>
    )
  }
  if (status === 'invited') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-1.5 py-0.5 whitespace-nowrap">
        <Clock size={10} /> 招待中
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-500 bg-gray-100 border border-gray-200 rounded-full px-1.5 py-0.5 whitespace-nowrap">
      <UserX size={10} /> アカウントなし
    </span>
  )
}

interface Props {
  initialStaff: CleaningStaff[]
  facilities: Facility[]
}

export function CleaningStaffManager({ initialStaff, facilities }: Props) {
  const router = useRouter()
  // 一覧はサーバー側で確定済み。追加・更新・削除の結果だけをこの場で反映する
  const [staff, setStaff] = useState<CleaningStaff[]>(initialStaff)
  const [error, setError] = useState('')

  // 追加フォーム
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [adding, setAdding] = useState(false)

  // 行ごとの状態
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // 招待
  const [invitingId, setInvitingId] = useState<string | null>(null)
  const [inviteFacilityId, setInviteFacilityId] = useState<string>(facilities[0]?.id ?? '')
  const [inviteBusy, setInviteBusy] = useState(false)
  const [inviteUrl, setInviteUrl] = useState('')
  const [copied, setCopied] = useState(false)

  const handleAdd = async () => {
    if (!name.trim()) { setError('名前を入力してください'); return }
    setAdding(true)
    setError('')
    try {
      const res = await fetch('/api/cleaning-staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email: email || null }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? '追加に失敗しました')
        return
      }
      setStaff(prev => [...prev, data])
      setName('')
      setEmail('')
      router.refresh()
    } catch {
      setError('通信エラーが発生しました。時間をおいて再度お試しください。')
    } finally {
      setAdding(false)
    }
  }

  const startEdit = (s: CleaningStaff) => {
    setEditingId(s.id)
    setEditName(s.name)
    setEditEmail(s.email ?? '')
    setError('')
  }

  const handleSaveEdit = async (id: string) => {
    if (!editName.trim()) { setError('名前を入力してください'); return }
    setSavingId(id)
    setError('')
    try {
      const res = await fetch('/api/cleaning-staff', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name: editName, email: editEmail || null }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? '更新に失敗しました')
        return
      }
      setStaff(prev => prev.map(s => (s.id === id ? data : s)))
      setEditingId(null)
      router.refresh()
    } catch {
      setError('通信エラーが発生しました。時間をおいて再度お試しください。')
    } finally {
      setSavingId(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('この清掃担当者を削除しますか？\n予約への割り当ては解除されます。\n（アカウントをお持ちの場合、施設へのアクセス権は施設管理のメンバー一覧から解除してください）')) return
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

  // 清掃担当者ロールで施設に招待する（招待は施設ごとなので施設を選ばせる）
  const handleInvite = async (s: CleaningStaff) => {
    if (!s.email || !inviteFacilityId) return
    setInviteBusy(true)
    setError('')
    setInviteUrl('')
    try {
      const res = await fetch('/api/facility-invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ facility_id: inviteFacilityId, invited_email: s.email, role: 'cleaner' }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? '招待の作成に失敗しました')
        return
      }
      setInviteUrl(data.invite_url)
      setInvitingId(null)
      // 招待中に切り替える（対象施設名はサーバー側の再取得で確定させる）
      const facilityName = facilities.find(f => f.id === inviteFacilityId)?.name ?? ''
      setStaff(prev => prev.map(row =>
        row.id === s.id
          ? { ...row, account_status: 'invited', facilities: [...row.facilities, facilityName] }
          : row
      ))
      router.refresh()
    } catch {
      setError('通信エラーが発生しました。時間をおいて再度お試しください。')
    } finally {
      setInviteBusy(false)
    }
  }

  const handleCopy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* noop */ }
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
          登録した清掃担当者は、予約一覧の各予約でプルダウンから割り当てられます。
          メールアドレスは任意です。入力して招待すると、その方はご自身のアカウントでログインし、
          担当施設の清掃予定（日程・ゲスト名・割り当て）だけを確認できます。
          メールアドレスなしでも、割り当て先として登録できます。
        </p>

        {/* 追加フォーム */}
        <div className="space-y-2 p-3 border border-dashed border-gray-300 rounded-xl">
          <p className="text-xs text-gray-400 font-medium">清掃担当者を追加</p>
          <input
            type="text"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="名前 *（例：山田、清掃業者A）"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
          />
          <div className="flex gap-2">
            <input
              type="email"
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="メールアドレス（任意・ログイン招待に使用）"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
            />
            <Button onClick={handleAdd} loading={adding}>
              <Plus size={15} className="mr-1" /> 追加
            </Button>
          </div>
        </div>

        {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

        {/* 発行された招待リンク */}
        {inviteUrl && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-2">
            <p className="text-xs font-medium text-green-700">招待リンクを発行しました（7日間有効）</p>
            <div className="flex items-center gap-2">
              <code className="text-xs text-gray-600 bg-white border border-gray-200 rounded px-2 py-1 flex-1 truncate">
                {inviteUrl}
              </code>
              <button
                onClick={() => handleCopy(inviteUrl)}
                className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? 'コピー済' : 'コピー'}
              </button>
            </div>
            <p className="text-xs text-gray-400">このリンクをLINEやメールで送ってください</p>
          </div>
        )}

        {/* 一覧 */}
        {staff.length > 0 ? (
          <div className="space-y-2">
            {staff.map(s => (
              <div key={s.id} className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 space-y-2">

                {editingId === s.id ? (
                  /* ── 編集モード ── */
                  <div className="space-y-2">
                    <input
                      type="text"
                      className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="名前 *"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                    />
                    <input
                      type="email"
                      className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="メールアドレス（任意）"
                      value={editEmail}
                      onChange={e => setEditEmail(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleSaveEdit(s.id)} loading={savingId === s.id}>
                        <Check size={13} className="mr-1" /> 保存
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                        <X size={13} className="mr-1" /> キャンセル
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* ── 表示モード ── */
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2 min-w-0">
                        <span className="w-7 h-7 rounded-full bg-indigo-50 flex items-center justify-center shrink-0 mt-0.5">
                          <Sparkles size={13} className="text-indigo-500" />
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-sm text-gray-800 font-medium truncate">{s.name}</span>
                            <StatusBadge status={s.account_status} />
                          </div>
                          <p className="text-xs text-gray-400 truncate">
                            {s.email ?? 'メールアドレス未登録（割り当てのみ）'}
                          </p>
                          {s.facilities.length > 0 && (
                            <p className="text-xs text-gray-400 truncate">
                              対象施設: {s.facilities.join('、')}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => startEdit(s)}
                          className="text-gray-400 hover:text-indigo-500 transition-colors p-1 rounded"
                          title="編集"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(s.id)}
                          disabled={deletingId === s.id}
                          className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded"
                          title="削除"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    {/* アカウント招待（メールアドレスがあり、まだ招待も参加もしていない場合） */}
                    {s.account_status === 'none' && s.email && (
                      invitingId === s.id ? (
                        <div className="flex flex-wrap items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                          <span className="text-xs text-gray-500 shrink-0">招待する施設:</span>
                          <select
                            value={inviteFacilityId}
                            onChange={e => setInviteFacilityId(e.target.value)}
                            className="flex-1 min-w-[8rem] text-xs bg-white border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                          >
                            {facilities.map(f => (
                              <option key={f.id} value={f.id}>{f.name}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleInvite(s)}
                            disabled={inviteBusy || !inviteFacilityId}
                            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                          >
                            {inviteBusy ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                            招待リンクを発行
                          </button>
                          <button
                            onClick={() => setInvitingId(null)}
                            className="shrink-0 text-xs text-gray-400 hover:text-gray-600"
                          >
                            キャンセル
                          </button>
                        </div>
                      ) : facilities.length > 0 ? (
                        <button
                          onClick={() => { setInvitingId(s.id); setInviteUrl('') }}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800"
                        >
                          <Send size={12} /> ログインアカウントに招待する
                        </button>
                      ) : (
                        <p className="text-xs text-gray-400">招待できる施設がありません（施設管理から施設を登録してください）</p>
                      )
                    )}

                    {s.account_status === 'none' && !s.email && (
                      <p className="text-xs text-gray-400">
                        ログインを許可する場合は、編集からメールアドレスを登録してください。
                      </p>
                    )}
                  </>
                )}
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
