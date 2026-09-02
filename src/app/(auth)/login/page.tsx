'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

// 外部サイトへ飛ばされないよう、自サイト内の絶対パスだけを遷移先として許可する
function safeRedirect(value: string | null): string {
  if (!value || !/^\/(?![/\\@.])[^\s]*$/.test(value)) return '/dashboard'
  return value
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = safeRedirect(searchParams.get('redirect'))
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      // 原因によって案内を変える（「確認メール未クリック」をパスワード誤りと表示していた）
      const code = error.code ?? ''
      if (code === 'email_not_confirmed') {
        setError('メールアドレスの確認が完了していません。登録時にお送りした確認メール内のリンクを開いてから、もう一度ログインしてください。')
      } else if (code === 'over_request_rate_limit' || error.status === 429) {
        setError('試行回数が上限に達しました。しばらく時間をおいてから再度お試しください。')
      } else if (code === 'user_banned') {
        setError('このアカウントは現在利用できません。管理者にお問い合わせください。')
      } else {
        setError('メールアドレスまたはパスワードが正しくありません')
      }
      setLoading(false)
      return
    }

    router.push(redirect)
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-navy-500 tracking-wide">GuestFollow</h1>
          <p className="text-gray-500 mt-2 text-sm">無人宿泊施設 セルフチェックインシステム</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">ログイン</h2>

          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              id="email"
              type="email"
              label="メールアドレス"
              placeholder="example@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              id="password"
              type="password"
              label="パスワード"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <div className="text-right -mt-1">
              <Link href="/forgot-password" className="text-xs text-navy-500 hover:underline">
                パスワードをお忘れですか？
              </Link>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
            )}

            <Button type="submit" className="w-full" size="lg" loading={loading}>
              ログイン
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            アカウントをお持ちでない方は{' '}
            <Link href="/signup" className="text-navy-500 hover:underline font-medium">
              新規登録
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
