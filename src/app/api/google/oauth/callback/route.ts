import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { exchangeCode, getConnectedEmail } from '@/lib/google/business'
import { googleRedirectUri, loadGoogleSettings } from '@/lib/google/credentials'

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const back = (params: Record<string, string>) =>
  NextResponse.redirect(`${appUrl()}/dashboard/reviews?${new URLSearchParams(params)}`)

// Googleからの戻り先。認可コードをrefresh tokenに交換して保存する。
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  if (error) return back({ error: `Googleでの連携が中止されました（${error}）` })
  if (!code) return back({ error: '認可コードを受け取れませんでした' })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(`${appUrl()}/login`)

  // state の照合（CSRF対策）
  const cookieState = request.headers.get('cookie')?.match(/google_oauth_state=([^;]+)/)?.[1]
  if (!state || !cookieState || state !== cookieState) {
    return back({ error: '不正なリクエストです。もう一度お試しください。' })
  }

  const settings = await loadGoogleSettings(supabase, user.id)
  if (!settings.clientId || !settings.clientSecret) return back({ error: 'クライアントIDが設定されていません' })

  try {
    const { refreshToken, accessToken } = await exchangeCode(
      settings.clientId, settings.clientSecret, code, googleRedirectUri()
    )
    const email = accessToken ? await getConnectedEmail(accessToken) : ''
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        google_refresh_token: refreshToken,
        google_connected_email: email || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
    if (updateError) return back({ error: `保存に失敗しました: ${updateError.message}` })
    const res = back({ connected: '1' })
    res.cookies.delete('google_oauth_state')
    return res
  } catch (e) {
    return back({ error: e instanceof Error ? e.message : '連携に失敗しました' })
  }
}
