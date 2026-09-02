'use client'

import { useState, useCallback } from 'react'
import { Users, UserPlus, Copy, Check, Trash2, ChevronRight, Clock, Loader2 } from 'lucide-react'

type Role = 'manager' | 'cleaner'

const ROLE_LABELS: Record<string, string> = {
  owner: 'オーナー',
  manager: '現場管理責任者',
  cleaner: '清掃担当者',
}
const ROLE_BADGE: Record<string, string> = {
  owner: 'bg-navy-100 text-navy-700',
  manager: 'bg-indigo-100 text-indigo-700',
  cleaner: 'bg-emerald-100 text-emerald-700',
}

function RoleBadge({ role }: { role: string }) {
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${ROLE_BADGE[role] ?? 'bg-gray-100 text-gray-600'}`}>
      {ROLE_LABELS[role] ?? role}
    </span>
  )
}

interface Member {
  id: string
  user_id: string
  email: string
  role: string
  created_at: string
}

interface Invitation {
  id: string
  invited_email: string
  role: string
  token: string
  expires_at: string
  created_at: string
}

interface Props {
  facilityId: string
  canManage: boolean   // オーナーまたは現場管理責任者
  myRole: string       // 現在のユーザーのこの施設でのロール
}

export function FacilityMembersManager({ facilityId, canManage, myRole }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [members, setMembers] = useState<Member[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<Role>('manager')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [newInviteUrl, setNewInviteUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [listError, setListError] = useState('')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''

  const fetchData = useCallback(async () => {
    if (!canManage) return
    setLoading(true)
    try {
      const res = await fetch(`/api/facility-invitations?facility_id=${facilityId}`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setListError(data.error ?? 'メンバー情報の取得に失敗しました')
        return
      }
      setListError('')
      setMembers(data.members ?? [])
      setInvitations(data.invitations ?? [])
    } catch {
      setListError('通信エラーが発生しました。時間をおいて再度お試しください。')
    } finally {
      setLoading(false)
    }
  }, [facilityId, canManage])

  // 開いたタイミングで読み込む（effect ではなく操作の中で取得する）
  const toggleOpen = () => {
    const next = !open
    setOpen(next)
    if (next) fetchData()
  }

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return
    setInviting(true)
    setInviteError('')
    setNewInviteUrl('')
    try {
      const res = await fetch('/api/facility-invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ facility_id: facilityId, invited_email: inviteEmail.trim(), role: inviteRole }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setInviteError(data.error || '招待の作成に失敗しました')
        return
      }
      setNewInviteUrl(data.invite_url)
      setInviteEmail('')
      fetchData()
    } catch {
      setInviteError('通信エラーが発生しました。時間をおいて再度お試しください。')
    } finally {
      setInviting(false)
    }
  }

  const handleCopy = async (url: string) => {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDeleteMember = async (member: Member) => {
    if (!confirm(`このメンバー（${member.email}）を削除しますか？`)) return
    setListError('')
    try {
      const res = await fetch(`/api/facility-invitations?type=member&id=${member.id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setListError(data.error ?? 'メンバーの削除に失敗しました')
        return
      }
      fetchData()
    } catch {
      setListError('通信エラーが発生しました。時間をおいて再度お試しください。')
    }
  }

  const handleCancelInvitation = async (invitation: Invitation) => {
    if (!confirm(`この招待（${invitation.invited_email}）をキャンセルしますか？`)) return
    setListError('')
    try {
      const res = await fetch(`/api/facility-invitations?type=invitation&id=${invitation.id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setListError(data.error ?? '招待のキャンセルに失敗しました')
        return
      }
      fetchData()
    } catch {
      setListError('通信エラーが発生しました。時間をおいて再度お試しください。')
    }
  }

  // 管理権限がない（清掃担当者など）はロールバッジ表示のみ
  if (!canManage) {
    return (
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 bg-gray-50">
          <Users size={14} className="text-gray-500" />
          <span className="text-sm font-medium text-gray-600">共有施設</span>
          <span className="ml-auto"><RoleBadge role={myRole} /></span>
        </div>
      </div>
    )
  }

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* トグルヘッダー */}
      <button
        onClick={toggleOpen}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <Users size={14} className="text-gray-500" />
          <span className="text-sm font-medium text-gray-600">管理メンバー</span>
          {members.length > 0 && (
            <span className="text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full">
              {members.length}名
            </span>
          )}
        </div>
        <span className="text-xs text-gray-400">{open ? '▲ 閉じる' : '▼ 開く'}</span>
      </button>

      {open && (
        <div className="p-4 space-y-4 bg-white">

          {/* メンバー招待フォーム */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <UserPlus size={13} className="text-indigo-500" />
              <p className="text-xs font-semibold text-indigo-700">メンバーを招待</p>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              招待リンクを発行して共有してください。相手はGuestFollowアカウントでログインして参加できます。
            </p>

            {/* ロール選択 */}
            <div className="grid grid-cols-2 gap-2">
              {(['manager', 'cleaner'] as Role[]).map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setInviteRole(r)}
                  className={`text-left rounded-lg border px-3 py-2 transition-colors ${
                    inviteRole === r
                      ? 'border-indigo-400 bg-indigo-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <p className={`text-xs font-bold ${inviteRole === r ? 'text-indigo-700' : 'text-gray-700'}`}>
                    {ROLE_LABELS[r]}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">
                    {r === 'manager' ? '運用・名簿・メッセージ・招待' : '日程と清掃割当の閲覧のみ'}
                  </p>
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="email"
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                placeholder="招待するメールアドレス"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleInvite()}
              />
              <button
                onClick={handleInvite}
                disabled={inviting || !inviteEmail.trim()}
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {inviting ? <Loader2 size={13} className="animate-spin" /> : <ChevronRight size={13} />}
                招待
              </button>
            </div>
            {inviteError && <p className="text-xs text-red-600">{inviteError}</p>}

            {/* 発行された招待URL */}
            {newInviteUrl && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-2">
                <p className="text-xs font-medium text-green-700">招待リンクを発行しました（7日間有効）</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs text-gray-600 bg-white border border-gray-200 rounded px-2 py-1 flex-1 truncate">
                    {newInviteUrl}
                  </code>
                  <button
                    onClick={() => handleCopy(newInviteUrl)}
                    className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
                  >
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    {copied ? 'コピー済' : 'コピー'}
                  </button>
                </div>
                <p className="text-xs text-gray-400">このリンクをLINEやメールで招待したい方に送ってください</p>
              </div>
            )}
          </div>

          {listError && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{listError}</p>}

          {loading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 size={20} className="animate-spin text-gray-400" />
            </div>
          )}

          {!loading && (
            <>
              {/* 招待中（承認待ち） */}
              {invitations.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-500 flex items-center gap-1.5">
                    <Clock size={12} /> 招待中（承認待ち）
                  </p>
                  <div className="space-y-1.5">
                    {invitations.map(inv => (
                      <div key={inv.id} className="flex items-center justify-between gap-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm text-gray-700 truncate">{inv.invited_email}</p>
                            <RoleBadge role={inv.role} />
                          </div>
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-gray-400">
                              期限: {new Date(inv.expires_at).toLocaleDateString('ja-JP')}
                            </p>
                            <button
                              onClick={() => handleCopy(`${appUrl}/invite/${inv.token}`)}
                              className="text-xs text-indigo-500 hover:text-indigo-700 flex items-center gap-0.5"
                            >
                              <Copy size={10} /> リンクをコピー
                            </button>
                          </div>
                        </div>
                        <button
                          onClick={() => handleCancelInvitation(inv)}
                          className="shrink-0 p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded"
                          title="招待をキャンセル"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 参加済みメンバー */}
              {members.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-500 flex items-center gap-1.5">
                    <Users size={12} /> 参加済みメンバー
                  </p>
                  <div className="space-y-1.5">
                    {members.map(member => (
                      <div key={member.id} className="flex items-center justify-between gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm text-gray-700 truncate">{member.email}</p>
                            <RoleBadge role={member.role} />
                          </div>
                          <p className="text-xs text-gray-400">
                            参加: {new Date(member.created_at).toLocaleDateString('ja-JP')}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteMember(member)}
                          className="shrink-0 p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded"
                          title="メンバーを削除"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {invitations.length === 0 && members.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-2">招待中・参加中のメンバーはいません</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
