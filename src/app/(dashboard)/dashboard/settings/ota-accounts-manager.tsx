'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Trash2, Eye, EyeOff, Link2, ChevronDown, MessageSquare, KeyRound, CheckCircle2, X, RefreshCw } from 'lucide-react'

type OtaAccount = {
  id: string
  provider: 'beds24' | 'airhost'
  label: string
  created_at: string
  has_longlife?: boolean
  has_refresh?: boolean
}

const PROVIDER_LABELS = {
  beds24: 'Beds24',
  airhost: 'Airhost',
}

const PROVIDER_COLORS = {
  beds24: 'text-blue-700 bg-blue-50 border-blue-200',
  airhost: 'text-purple-700 bg-purple-50 border-purple-200',
}

export function OtaAccountsManager({ initialAccounts }: { initialAccounts: OtaAccount[] }) {
  const router = useRouter()
  const [accounts, setAccounts] = useState<OtaAccount[]>(initialAccounts)
  const [showAddForm, setShowAddForm] = useState(false)

  // 追加フォーム state
  const [provider, setProvider] = useState<'beds24' | 'airhost'>('beds24')
  const [label, setLabel] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')

  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [refreshingId, setRefreshingId] = useState<string | null>(null)

  const [addStep, setAddStep] = useState<string | null>(null)
  const [addResult, setAddResult] = useState<string | null>(null)
  // 一覧側の操作（再取込・削除・解除）のエラー表示
  const [opError, setOpError] = useState('')

  // Refresh Token（invite code）設定用 state
  const [refreshFor, setRefreshFor] = useState<string | null>(null) // 入力欄を開いているアカウントID
  const [inviteCode, setInviteCode] = useState('')
  const [refreshBusy, setRefreshBusy] = useState(false)
  const [refreshError, setRefreshError] = useState('')

  const setAccountRefresh = (id: string, has_refresh: boolean) =>
    setAccounts(prev => prev.map(a => (a.id === id ? { ...a, has_refresh } : a)))

  const handleSaveRefresh = async (id: string) => {
    if (!inviteCode.trim()) { setRefreshError('invite code を入力してください'); return }
    setRefreshBusy(true)
    setRefreshError('')
    try {
      const res = await fetch('/api/ota-accounts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, invite_code: inviteCode.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setRefreshError(data.error ?? 'Refresh Tokenの設定に失敗しました')
        return
      }
      setAccountRefresh(id, true)
      setRefreshFor(null)
      setInviteCode('')
      router.refresh()
    } catch {
      setRefreshError('通信エラーが発生しました。時間をおいて再度お試しください。')
    } finally {
      setRefreshBusy(false)
    }
  }

  const handleRemoveRefresh = async (id: string) => {
    if (!confirm('メッセージ連携（Refresh Token）を解除しますか？\n解除するとこのアカウントではメッセージ送信ができなくなります。')) return
    setRefreshBusy(true)
    setRefreshError('')
    setOpError('')
    try {
      const res = await fetch('/api/ota-accounts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, remove_refresh: true }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setOpError(data.error ?? 'メッセージ連携の解除に失敗しました')
        return
      }
      setAccountRefresh(id, false)
      router.refresh()
    } catch {
      setOpError('通信エラーが発生しました。時間をおいて再度お試しください。')
    } finally {
      setRefreshBusy(false)
    }
  }

  const handleAdd = async () => {
    if (!apiKey.trim()) { setAddError('トークンを入力してください'); return }
    setAdding(true)
    setAddError('')
    setAddResult(null)
    setOpError('')

    try {
      // ① アカウント登録
      setAddStep('アカウントを登録中…')
      const res = await fetch('/api/ota-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, label, api_key: apiKey }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setAddError(data.error ?? '追加に失敗しました')
        return
      }

      // ② 施設を自動インポート（トークン検証を兼ねる）
      setAddStep('施設情報を読み込み中…')
      const importRes = await fetch(`/api/${provider}/import-facilities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: data.id }),
      })
      const importData = await importRes.json().catch(() => ({}))

      if (!importRes.ok) {
        // トークン不正など → アカウントを削除して再入力を促す
        await fetch(`/api/ota-accounts?id=${data.id}`, { method: 'DELETE' }).catch(() => {})
        setAddError(
          `${importData.error ?? '施設の読み込みに失敗しました'}\nトークンが正しいか確認して、もう一度追加してください。`
        )
        return
      }

      // ③ 予約を自動同期
      setAddStep('予約情報を読み込み中…')
      let syncedNote = ''
      let syncFailed = false
      try {
        const syncRes = await fetch('/api/bookings/sync-all', { method: 'POST' })
        const syncData = await syncRes.json().catch(() => ({}))
        if (syncRes.ok && !(Array.isArray(syncData.errors) && syncData.errors.length > 0)) {
          syncedNote = `／ 予約 ${syncData.synced}件を取り込みました`
        } else {
          syncFailed = true
        }
      } catch {
        syncFailed = true
      }

      setAccounts(prev => [...prev, data])
      setShowAddForm(false)
      setLabel('')
      setApiKey('')
      setProvider('beds24')
      const importNote = `施設 ${importData.imported}件をインポート${importData.skipped > 0 ? `（${importData.skipped}件は登録済み）` : ''}`
      if (syncFailed) {
        setOpError(
          `アカウントは登録されましたが予約の同期に失敗しました。あとで「再取込」から再実行できます（${importNote}）`
        )
      } else {
        setAddResult(`連携が完了しました。${importNote}${syncedNote}`)
        setTimeout(() => setAddResult(null), 10000)
      }
      router.refresh()
    } catch {
      setAddError('通信エラーが発生しました。時間をおいて再度お試しください。')
    } finally {
      setAddStep(null)
      setAdding(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('このアカウント連携を削除しますか？\n施設の紐付けは解除されますが、施設・予約データは削除されません。')) return
    setDeletingId(id)
    setOpError('')
    try {
      const res = await fetch(`/api/ota-accounts?id=${id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setOpError(data.error ?? '連携の削除に失敗しました')
        return
      }
      setAccounts(prev => prev.filter(a => a.id !== id))
      router.refresh()
    } catch {
      setOpError('通信エラーが発生しました。時間をおいて再度お試しください。')
    } finally {
      setDeletingId(null)
    }
  }

  // 連携済みアカウントの再取込：施設を再インポート → 予約を同期
  const handleRefreshAccount = async (acc: OtaAccount) => {
    setRefreshingId(acc.id)
    setAddError('')
    setAddResult(null)
    setOpError('')

    try {
      const impRes = await fetch(`/api/${acc.provider}/import-facilities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: acc.id }),
      })
      const impData = await impRes.json().catch(() => ({}))
      if (!impRes.ok) {
        setOpError(impData.error ?? '施設の再取込に失敗しました。トークンが有効かご確認ください。')
        return
      }

      let syncedNote = ''
      let syncFailed = false
      try {
        const syncRes = await fetch('/api/bookings/sync-all', { method: 'POST' })
        const s = await syncRes.json().catch(() => ({}))
        if (syncRes.ok && !(Array.isArray(s.errors) && s.errors.length > 0)) {
          syncedNote = `／ 予約 ${s.synced}件を同期`
        } else {
          syncFailed = true
        }
      } catch {
        syncFailed = true
      }

      const importNote = `施設 ${impData.imported}件をインポート${impData.skipped > 0 ? `（${impData.skipped}件は登録済み）` : ''}`
      if (syncFailed) {
        setOpError(
          `施設は更新されましたが予約の同期に失敗しました。あとで「再取込」から再実行できます（${importNote}）`
        )
      } else {
        setAddResult(`${PROVIDER_LABELS[acc.provider]}を更新しました。${importNote}${syncedNote}`)
        setTimeout(() => setAddResult(null), 10000)
      }
      router.refresh()
    } catch {
      setOpError('通信エラーが発生しました。時間をおいて再度お試しください。')
    } finally {
      setRefreshingId(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link2 size={18} className="text-gray-500" />
            <h3 className="font-semibold text-gray-900">サイトコントローラー連携</h3>
          </div>
          <button
            onClick={() => { setShowAddForm(v => !v); setAddError('') }}
            className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-medium px-2.5 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
          >
            <Plus size={14} /> アカウントを追加
          </button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">

        {/* 連携完了メッセージ */}
        {addResult && (
          <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            {addResult}
          </p>
        )}

        {opError && (
          <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 whitespace-pre-line">{opError}</p>
        )}

        {/* 追加フォーム */}
        {showAddForm && (
          <div className="border border-indigo-200 bg-indigo-50 rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-indigo-700">新しいサイトコントローラーを追加</p>

            {/* プロバイダ選択 */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">サービス</label>
              <div className="relative">
                <select
                  value={provider}
                  onChange={e => setProvider(e.target.value as 'beds24' | 'airhost')}
                  className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pr-8 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="beds24">Beds24</option>
                  <option value="airhost">Airhost</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* ラベル */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                ラベル（任意）
              </label>
              <input
                type="text"
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="例：メインアカウント、長野物件用"
                value={label}
                onChange={e => setLabel(e.target.value)}
              />
            </div>

            {/* APIトークン */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                {provider === 'beds24' ? 'Long Life Token（読み取り用）' : 'APIキー'}
              </label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder={provider === 'beds24' ? 'Beds24のLong Life Tokenを貼り付け' : 'AirhostのAPIキー'}
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                />
                <button type="button" onClick={() => setShowKey(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {provider === 'beds24' ? (
                <div className="text-xs text-gray-400 mt-1 leading-relaxed">
                  <span className="font-medium text-gray-600">用途：施設情報・予約の取り込み（読み取り）。</span><br />
                  Beds24管理画面 → <span className="font-medium text-gray-500">SETTINGS → ACCOUNT → ACCESS</span> の
                  「Long Life Token」を生成し、<code className="bg-gray-100 px-1 rounded">read:properties</code> /
                  <code className="bg-gray-100 px-1 rounded">read:bookings</code> スコープを付けて貼り付けてください。<br />
                  <span className="text-gray-500">
                    ※ メッセージ送信には別途「Refresh Token」の設定が必要です（連携後、一覧の各アカウントから設定できます）。
                  </span>
                </div>
              ) : (
                <p className="text-xs text-gray-400 mt-1">
                  Airhost管理画面 → 設定 → API連携 からAPIキーを取得できます
                </p>
              )}
            </div>

            {addStep && (
              <p className="text-xs text-indigo-600 bg-indigo-100 rounded-lg px-3 py-2 animate-pulse">{addStep}</p>
            )}
            {addError && (
              <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 whitespace-pre-line">{addError}</p>
            )}

            <div className="flex gap-2">
              <Button onClick={handleAdd} loading={adding} className="flex-1">
                連携して読み込む
              </Button>
              <Button variant="outline" onClick={() => { setShowAddForm(false); setAddError('') }}>
                キャンセル
              </Button>
            </div>
          </div>
        )}

        {/* アカウント一覧 */}
        {accounts.length > 0 ? (
          <div className="space-y-2">
            {accounts.map(acc => (
              <div key={acc.id}
                className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border shrink-0 ${PROVIDER_COLORS[acc.provider]}`}>
                      {PROVIDER_LABELS[acc.provider]}
                    </span>
                    <span className="text-sm text-gray-700 truncate">
                      {acc.label || `${PROVIDER_LABELS[acc.provider]}アカウント`}
                    </span>
                    <span className="text-xs text-gray-400 shrink-0">
                      {new Date(acc.created_at).toLocaleDateString('ja-JP')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleRefreshAccount(acc)}
                      disabled={refreshingId === acc.id || deletingId === acc.id}
                      title="最新の施設・予約を再取込"
                      aria-label="最新の施設・予約を再取込"
                      className="text-gray-400 hover:text-navy-600 transition-colors p-1 rounded disabled:opacity-50"
                    >
                      <RefreshCw size={15} className={refreshingId === acc.id ? 'animate-spin' : ''} />
                    </button>
                    <button
                      onClick={() => handleDelete(acc.id)}
                      disabled={deletingId === acc.id || refreshingId === acc.id}
                      title="連携を削除"
                      aria-label="連携を削除"
                      className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded disabled:opacity-50"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Beds24: トークンの設定状況とメッセージ連携（Refresh Token） */}
                {acc.provider === 'beds24' && (
                  <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {/* 読み取り用 */}
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${acc.has_longlife ? 'text-green-700 bg-green-50 border-green-200' : 'text-gray-400 bg-gray-50 border-gray-200'}`}>
                        <KeyRound size={11} /> 読み取り（Long Life Token）{acc.has_longlife ? '設定済み' : '未設定'}
                      </span>
                      {/* メッセージ用 */}
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${acc.has_refresh ? 'text-green-700 bg-green-50 border-green-200' : 'text-amber-700 bg-amber-50 border-amber-200'}`}>
                        <MessageSquare size={11} /> メッセージ送信（Refresh Token）{acc.has_refresh ? '設定済み' : '未設定'}
                      </span>
                    </div>

                    {/* 操作行 */}
                    {refreshFor === acc.id ? (
                      <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 space-y-2">
                        <p className="text-xs font-semibold text-indigo-700 flex items-center gap-1">
                          <MessageSquare size={12} /> メッセージ連携（Refresh Token）を設定
                        </p>
                        <p className="text-[11px] text-gray-500 leading-relaxed">
                          Beds24管理画面 → <span className="font-medium">SETTINGS → ACCOUNT → ACCESS</span> で
                          <span className="font-medium">書き込みスコープ（<code className="bg-white px-1 rounded">write:bookings</code> / <code className="bg-white px-1 rounded">read:bookings-personal</code> 等）</span>
                          を選んだ <span className="font-medium">invite code</span> を発行し、下に貼り付けてください。<br />
                          ※ invite code は発行から24時間で失効します。設定時に一度だけ使用し、以降は自動更新されます。
                        </p>
                        <input
                          type="text"
                          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="invite code を貼り付け"
                          value={inviteCode}
                          onChange={e => setInviteCode(e.target.value)}
                        />
                        {refreshError && (
                          <p className="text-[11px] text-red-600 bg-red-50 rounded px-2 py-1 whitespace-pre-line">{refreshError}</p>
                        )}
                        <div className="flex gap-2">
                          <Button onClick={() => handleSaveRefresh(acc.id)} loading={refreshBusy} className="flex-1 !py-1.5 text-xs">
                            設定する
                          </Button>
                          <button
                            onClick={() => { setRefreshFor(null); setInviteCode(''); setRefreshError('') }}
                            className="text-xs text-gray-500 hover:text-gray-700 px-3 rounded-lg border border-gray-200 bg-white flex items-center gap-1"
                          >
                            <X size={12} /> キャンセル
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        {acc.has_refresh ? (
                          <>
                            <span className="inline-flex items-center gap-1 text-xs text-green-600">
                              <CheckCircle2 size={13} /> メッセージ送信が利用できます
                            </span>
                            <button
                              onClick={() => { setRefreshFor(acc.id); setInviteCode(''); setRefreshError('') }}
                              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                            >
                              再設定
                            </button>
                            <button
                              onClick={() => handleRemoveRefresh(acc.id)}
                              disabled={refreshBusy}
                              className="text-xs text-gray-400 hover:text-red-500"
                            >
                              解除
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => { setRefreshFor(acc.id); setInviteCode(''); setRefreshError('') }}
                            className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium px-2.5 py-1.5 rounded-lg hover:bg-indigo-50"
                          >
                            <Plus size={13} /> メッセージ連携（Refresh Token）を設定
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          !showAddForm && (
            <p className="text-sm text-gray-400 text-center py-4">
              サイトコントローラーが登録されていません。<br />「アカウントを追加」から連携してください。
            </p>
          )
        )}

        {/* 2種類のトークンの説明 */}
        <div className="mt-2 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <KeyRound size={14} className="text-gray-500" />
            <p className="text-xs font-semibold text-gray-700">Beds24は2種類のトークンを「別々に」設定します</p>
          </div>
          <div className="space-y-2.5 text-xs text-gray-600 leading-relaxed">
            <div className="rounded-lg bg-white border border-gray-200 p-2.5">
              <p className="font-semibold text-gray-800 flex items-center gap-1 mb-0.5">
                <KeyRound size={11} className="text-gray-500" /> ① Long Life Token（読み取り用・必須）
              </p>
              <p>
                施設情報や予約の<span className="font-medium">取り込み（読み取り）</span>に使います。
                Beds24管理画面 → <span className="font-medium">SETTINGS → ACCOUNT → ACCESS</span> で発行し、
                アカウント追加時に入力します。読み取り専用のため<span className="font-medium">メッセージ送信はできません</span>。
              </p>
            </div>
            <div className="rounded-lg bg-white border border-gray-200 p-2.5">
              <p className="font-semibold text-gray-800 flex items-center gap-1 mb-0.5">
                <MessageSquare size={11} className="text-indigo-500" /> ② Refresh Token（メッセージ送信用・任意）
              </p>
              <p>
                ゲストへの<span className="font-medium">メッセージ送信（書き込み）</span>に使います。
                Beds24で<span className="font-medium">書き込みスコープ付きの invite code</span>
                （<code className="bg-gray-100 px-1 rounded">write:bookings</code> / <code className="bg-gray-100 px-1 rounded">read:bookings-personal</code> 等）を発行し、
                <span className="font-medium">連携後に各アカウントの「メッセージ連携（Refresh Token）を設定」から</span>入力します。
                入力した invite code は自動的に Refresh Token に変換して保存され、以降のアクセストークンは自動更新されます。
              </p>
            </div>
            <p className="text-[11px] text-gray-400">
              ※ 2つは用途が異なるため、それぞれ別に設定します。①だけでも予約管理は利用できます。メッセージ送信も使う場合は②も設定してください。
              なおBeds24の仕様上、メッセージ対象はOTA予約のみです。
            </p>
            <p className="text-[11px] text-gray-400">
              ※ Airhostのメッセージ送受信APIは一般公開されていないため、Airhostサポートへの個別申請が必要です（現在メッセージはBeds24のみ対応）。
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
