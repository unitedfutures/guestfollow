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

// Supabaseのエラーは英語で返るため、よくあるものは日本語に置き換える
function signupErrorMessage(code: string, message: string): string {
  switch (code) {
    case 'user_already_exists':
    case 'email_exists':
      return 'このメールアドレスは既に登録されています。ログインするか、パスワード再設定をお試しください。'
    case 'weak_password':
      return 'パスワードが簡単すぎます。8文字以上で、英字と数字を組み合わせてください。'
    case 'email_address_invalid':
    case 'validation_failed':
      return 'メールアドレスの形式が正しくありません。'
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return '試行回数が上限に達しました。しばらく時間をおいてから再度お試しください。'
    case 'signup_disabled':
      return '現在、新規登録を受け付けていません。お手数ですがお問い合わせください。'
    default:
      return `登録に失敗しました（${message}）`
  }
}

function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = safeRedirect(searchParams.get('redirect'))
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { company_name: companyName },
        emailRedirectTo: `${window.location.origin}/api/auth/callback?redirect=${encodeURIComponent(redirect)}`,
      },
    })

    if (error) {
      setError(signupErrorMessage(error.code ?? '', error.message))
      setLoading(false)
      return
    }

    setDone(true)
    setLoading(false)
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-navy-50 to-white flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="text-5xl mb-4">✉️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">確認メールを送信しました</h2>
          <p className="text-gray-500 text-sm">
            {email} に確認メールを送りました。<br />
            メール内のリンクをクリックして登録を完了してください。
          </p>
          <Link href="/login" className="mt-6 inline-block text-navy-500 hover:underline text-sm">
            ログインページへ
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
          <h2 className="text-xl font-semibold text-gray-900 mb-6">新規登録</h2>

          <form onSubmit={handleSignup} className="space-y-4">
            <Input
              id="companyName"
              type="text"
              label="会社名・屋号"
              placeholder="株式会社〇〇"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
            />
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
              label="パスワード（8文字以上）"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />

            {/* 規約への同意（同意しないと登録できない） */}
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5 rounded border-gray-300 text-navy-500"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
              />
              <span className="text-xs text-gray-600 leading-relaxed">
                <Link href="/privacy" target="_blank" className="text-navy-500 hover:underline">プライバシーポリシー</Link>
                {' '}および{' '}
                <Link href="/tokusho" target="_blank" className="text-navy-500 hover:underline">特定商取引法に基づく表記</Link>
                {' '}に同意します
              </span>
            </label>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
            )}

            <Button type="submit" className="w-full" size="lg" loading={loading} disabled={!agreed}>
              登録する
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            すでにアカウントをお持ちの方は{' '}
            <Link href="/login" className="text-navy-500 hover:underline font-medium">
              ログイン
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  )
}
