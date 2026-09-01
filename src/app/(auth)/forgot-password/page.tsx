'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    // リセットメールのリンクは認証コールバック経由で /reset-password に遷移させる
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/api/auth/callback?redirect=/reset-password`,
    })

    if (error) {
      setError('メールの送信に失敗しました。時間をおいて再度お試しください。')
      setLoading(false)
      return
    }

    // 登録の有無に関わらず成功表示（アカウント有無の推測を防ぐ）
    setDone(true)
    setLoading(false)
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-navy-50 to-white flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="text-5xl mb-4">✉️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">メールを送信しました</h2>
          <p className="text-gray-500 text-sm leading-relaxed">
            {email} 宛にパスワード再設定用のリンクをお送りしました。<br />
            メール内のリンクを開いて、新しいパスワードを設定してください。
          </p>
          <p className="text-gray-400 text-xs mt-4">
            メールが届かない場合は、迷惑メールフォルダをご確認のうえ、アドレスに誤りがないか再度お試しください。
          </p>
          <Link href="/login" className="mt-6 inline-block text-navy-500 hover:underline text-sm">
            ログインページへ戻る
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-navy-500 tracking-wide">GuestFollow</h1>
          <p className="text-gray-500 mt-2 text-sm">無人宿泊施設 セルフチェックインシステム</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">パスワードの再設定</h2>
          <p className="text-sm text-gray-500 mb-6">
            ご登録のメールアドレスを入力してください。再設定用のリンクをメールでお送りします。
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="email"
              type="email"
              label="メールアドレス"
              placeholder="example@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
            )}

            <Button type="submit" className="w-full" size="lg" loading={loading}>
              再設定メールを送信
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            <Link href="/login" className="text-navy-500 hover:underline font-medium">
              ログインページへ戻る
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
