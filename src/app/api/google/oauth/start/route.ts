import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { buildAuthUrl } from '@/lib/google/business'
import { googleRedirectUri, loadGoogleSettings } from '@/lib/google/credentials'
import { randomBytes } from 'crypto'

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

// Googleの認可画面へ送る。stateはCookieに保存し、戻ってきたときに照合する。
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(`${appUrl()}/login`)

  const settings = await loadGoogleSettings(supabase, user.id)
  if (!settings.clientId || !settings.clientSecret) {
    return NextResponse.redirect(
      `${appUrl()}/dashboard/reviews?error=${encodeURIComponent('先にクライアントIDとシークレットを保存してください')}`
    )
  }

  const state = randomBytes(16).toString('hex')
  const res = NextResponse.redirect(buildAuthUrl(settings.clientId, googleRedirectUri(), state))
  res.cookies.set('google_oauth_state', state, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', path: '/', maxAge: 600,
  })
  return res
}
