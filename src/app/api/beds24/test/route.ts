/**
 * Beds24 API 診断エンドポイント
 * GET /api/beds24/test  → /properties と /bookings の生レスポンスを返す
 */
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { beds24RawFetch } from '@/lib/beds24/client'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('beds24_api_key')
    .eq('id', user.id)
    .single()

  if (!profile?.beds24_api_key) {
    return NextResponse.json({ error: 'Beds24 APIキーが未設定です' }, { status: 400 })
  }

  const apiKey = profile.beds24_api_key

  // /properties テスト
  const propsResult = await beds24RawFetch('/properties', apiKey)

  // /bookings テスト（本日から30日）
  const today = new Date().toISOString().split('T')[0]
  const future = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  const bookingsResult = await beds24RawFetch(`/bookings?arrivalFrom=${today}&arrivalTo=${future}`, apiKey)

  // /getprops テスト（v1互換確認用）
  const v1PropsResult = await beds24RawFetch('/getprops', apiKey)

  return NextResponse.json({
    apiKeyLength: apiKey.length,
    apiKeyPrefix: apiKey.slice(0, 8) + '...',
    endpoints: {
      '/properties': propsResult,
      '/bookings':   bookingsResult,
      '/getprops (v1 legacy)': v1PropsResult,
    },
  })
}
