'use client'

import { useState } from 'react'
import Link from 'next/link'
import { UserX, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { WITHDRAW_CONFIRM_TEXT } from '@/lib/account'

export function WithdrawSection({ ownFacilityCount, email }: { ownFacilityCount: number; email: string }) {
  const [open, setOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const withdraw = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: confirmText.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? '退会処理に失敗しました')
        setLoading(false)
        return
      }
      // アカウントは削除済み。手元に残ったログイン情報を消してトップへ戻す
      await createClient().auth.signOut().catch(() => {})
      alert('退会が完了しました。ご利用ありがとうございました。')
      window.location.href = '/'
    } catch {
      setError('通信エラーが発生しました。時間をおいて再度お試しください。')
      setLoading(false)
    }
  }

  return (
    <Card className="border-red-200">
      <CardHeader className="border-red-100">
        <div className="flex items-center gap-2">
          <UserX size={18} className="text-red-500" />
          <h3 className="font-semibold text-gray-900">退会</h3>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-gray-600 space-y-2">
          <p>
            退会すると、アカウント（{email}）と次のデータが<span className="font-semibold text-red-600">直ちに削除され、元に戻せません</span>。
          </p>
          <ul className="list-disc pl-5 space-y-1 text-gray-600">
            <li>
              あなたがオーナーの施設（{ownFacilityCount}件）と、その予約・宿泊者名簿・顔写真／旅券画像・メッセージ・アンケート回答・価格ルール
            </li>
            <li>サイトコントローラー連携（Beds24・Airhostのトークン）、清掃担当者の登録</li>
          </ul>
          {ownFacilityCount > 0 && (
            <p className="text-xs text-gray-500">
              ※ 施設に招待したメンバー・清掃担当者も、その施設を利用できなくなります。
            </p>
          )}
          <p className="text-xs text-gray-500">
            ※ 招待されて参加している他の方の施設のデータは削除されません（あなたが登録した予約は施設のオーナーに引き継がれます）。
          </p>
        </div>

        <div className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
          <AlertTriangle size={14} className="shrink-0 mt-0.5 text-amber-500" />
          <span>
            宿泊者名簿は、旅館業法等により事業者に一定期間の保存が義務付けられています。退会前に、
            <Link href="/dashboard" className="text-navy-700 hover:underline font-medium">予約一覧</Link>
            の「CSV出力」などで必要なデータを保存してください。Beds24・Airhost側のデータは削除されません。
          </span>
        </div>

        {!open ? (
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setOpen(true)}
              className="!border-red-300 !text-red-600 hover:!bg-red-50 text-sm">
              <UserX size={14} /> 退会する
            </Button>
          </div>
        ) : (
          <div className="rounded-lg border border-red-200 bg-red-50/50 p-4 space-y-3">
            <label className="block text-sm text-gray-700">
              確認のため「<span className="font-semibold">{WITHDRAW_CONFIRM_TEXT}</span>」と入力してください
              <input
                type="text"
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                placeholder={WITHDRAW_CONFIRM_TEXT}
                autoComplete="off"
                className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
              />
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setOpen(false); setConfirmText(''); setError('') }}
                disabled={loading} className="text-sm">
                キャンセル
              </Button>
              <Button variant="danger" onClick={withdraw} loading={loading}
                disabled={confirmText.trim() !== WITHDRAW_CONFIRM_TEXT}
                className="text-sm">
                退会してデータを削除する
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
