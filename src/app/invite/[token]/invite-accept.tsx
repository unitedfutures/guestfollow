'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, CheckCircle, AlertCircle, Clock, LogIn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface Props {
  token: string
  facilityName: string
  facilityAddress: string | null
  invitedEmail: string
  isExpired: boolean
  isAccepted: boolean
  isLoggedIn: boolean
  currentUserEmail: string | null
}

export function InviteAccept({
  token,
  facilityName,
  facilityAddress,
  invitedEmail,
  isExpired,
  isAccepted,
  isLoggedIn,
  currentUserEmail,
}: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const handleAccept = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/facility-invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || '参加に失敗しました')
        return
      }
      setDone(true)
      setTimeout(() => router.push('/dashboard'), 1500)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <p className="text-navy-700 font-bold text-lg tracking-widest">GuestFollow</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">

          {/* 施設情報 */}
          <div className="flex items-start gap-3 mb-6 p-4 bg-indigo-50 rounded-xl">
            <Building2 size={20} className="text-indigo-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-gray-900">{facilityName}</p>
              {facilityAddress && <p className="text-xs text-gray-500 mt-0.5">{facilityAddress}</p>}
            </div>
          </div>

          {/* 期限切れ */}
          {isExpired && (
            <div className="text-center space-y-3">
              <Clock size={40} className="text-gray-400 mx-auto" />
              <h2 className="text-gray-900 font-bold">招待リンクの有効期限が切れています</h2>
              <p className="text-sm text-gray-500">招待者に新しい招待リンクを再発行してもらってください。</p>
            </div>
          )}

          {/* 承認済み */}
          {!isExpired && isAccepted && (
            <div className="text-center space-y-3">
              <CheckCircle size={40} className="text-green-500 mx-auto" />
              <h2 className="text-gray-900 font-bold">この招待リンクは使用済みです</h2>
              <p className="text-sm text-gray-500">すでにメンバーとして登録されています。</p>
              {isLoggedIn && (
                <Link href="/dashboard">
                  <Button className="w-full mt-2">ダッシュボードへ</Button>
                </Link>
              )}
            </div>
          )}

          {/* 未ログイン */}
          {!isExpired && !isAccepted && !isLoggedIn && (
            <div className="text-center space-y-4">
              <LogIn size={40} className="text-indigo-500 mx-auto" />
              <h2 className="text-gray-900 font-bold">施設管理への招待</h2>
              <p className="text-sm text-gray-500 leading-relaxed">
                <span className="font-medium text-gray-700">{facilityName}</span> の管理メンバーとして招待されています。
                ログイン（またはアカウント作成）して参加してください。
              </p>
              <p className="text-xs text-gray-400">招待先: {invitedEmail}</p>
              <Link href={`/login?redirect=/invite/${token}`}>
                <Button className="w-full">ログインして参加する</Button>
              </Link>
              <Link href={`/signup?redirect=/invite/${token}`}>
                <button className="w-full text-sm text-indigo-600 hover:text-indigo-800 transition-colors">
                  アカウントを新規作成して参加する
                </button>
              </Link>
            </div>
          )}

          {/* ログイン済み・承認待ち */}
          {!isExpired && !isAccepted && isLoggedIn && !done && (
            <div className="space-y-4">
              <div className="text-center">
                <h2 className="text-gray-900 font-bold text-lg mb-1">施設管理への招待</h2>
                <p className="text-sm text-gray-500">
                  <span className="font-medium text-gray-700">{facilityName}</span> の管理メンバーとして招待されています。
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg px-4 py-3 text-sm">
                <p className="text-gray-400 text-xs">ログイン中のアカウント</p>
                <p className="text-gray-900 mt-0.5 font-medium">{currentUserEmail}</p>
              </div>
              <p className="text-xs text-gray-400 text-center">招待先: {invitedEmail}</p>
              {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                  <AlertCircle size={14} />
                  {error}
                </div>
              )}
              <Button className="w-full" size="lg" onClick={handleAccept} disabled={loading}>
                {loading ? '処理中...' : 'メンバーとして参加する'}
              </Button>
            </div>
          )}

          {/* 参加完了 */}
          {done && (
            <div className="text-center space-y-3">
              <CheckCircle size={40} className="text-green-500 mx-auto" />
              <h2 className="text-gray-900 font-bold">参加完了！</h2>
              <p className="text-sm text-gray-500">ダッシュボードへ移動します...</p>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
