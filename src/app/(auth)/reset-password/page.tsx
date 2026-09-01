'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [checking, setChecking] = useState(true)
  const [validSession, setValidSession] = useState(false)

  // 認証コールバックで確立したリカバリーセッションの有無を確認
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setValidSession(!!data.user)
      setChecking(false)
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('パスワードは8文字以上で入力してください')
      return
    }
    if (password !== confirm) {
      setError('確認用パスワードが一致しません')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError('パスワードの更新に失敗しました。リンクの有効期限が切れている可能性があります。お手数ですが再度お試しください。')
      setLoading(false)
      return
    }

    setDone(true)
    setLoading(false)
  }

  // セッション確認中
  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-navy-50 to-white flex items-center justify-center p-4">
        <p className="text-gray-400 text-sm">確認中…</p>
      </div>
    )
  }

  // 完了
  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-navy-50 to-white flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">パスワードを更新しました</h2>
          <p className="text-gray-500 text-sm">新しいパスワードでログインできます。</p>
          <Button className="mt-6" size="lg" onClick={() => { router.push('/dashboard'); router.refresh() }}>
            ダッシュボードへ
          </Button>
        </div>
      </div>
    )
  }

  // リカバリーセッションが無い（リンク切れ・直接アクセス等）
  if (!validSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-navy-50 to-white flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">リンクが無効または期限切れです</h2>
          <p className="text-gray-500 text-sm leading-relaxed">
            パスワード再設定のリンクが無効か、有効期限が切れています。<br />
            お手数ですが、もう一度再設定メールをリクエストしてください。
          </p>
          <Link href="/forgot-password" className="mt-6 inline-block text-navy-500 hover:underline text-sm">
            再設定メールを送り直す
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
          <h2 className="text-xl font-semibold text-gray-900 mb-6">新しいパスワードの設定</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="password"
              type="password"
              label="新しいパスワード（8文字以上）"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
            <Input
              id="confirm"
              type="password"
              label="新しいパスワード（確認）"
              placeholder="••••••••"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              minLength={8}
              required
            />

            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
            )}

            <Button type="submit" className="w-full" size="lg" loading={loading}>
              パスワードを更新
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
