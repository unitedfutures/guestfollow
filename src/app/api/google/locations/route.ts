import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getAccessToken, listLocations } from '@/lib/google/business'
import { loadGoogleSettings, toCredentials } from '@/lib/google/credentials'
import { isMissingColumn } from '@/lib/beds24/sync-write'

// 連携アカウントが管理しているロケーション一覧（施設との紐づけ用）
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const cred = toCredentials(await loadGoogleSettings(supabase, user.id))
  if (!cred) return NextResponse.json({ error: 'Googleと連携されていません' }, { status: 400 })

  try {
    const token = await getAccessToken(cred)
    return NextResponse.json({ locations: await listLocations(token) })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : '取得に失敗しました' }, { status: 502 })
  }
}

// 施設にロケーションを紐づける
export async function PUT(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { facility_id, location_name, location_title } = await request.json().catch(() => ({}))
  if (typeof facility_id !== 'string') return NextResponse.json({ error: 'facility_id は必須です' }, { status: 400 })
  // 解除のときは null を入れる
  const name = typeof location_name === 'string' && location_name.trim() ? location_name.trim() : null
  if (name && !/^accounts\/\d+\/locations\/\d+$/.test(name)) {
    return NextResponse.json({ error: 'ロケーションの指定が正しくありません' }, { status: 400 })
  }

  const { error } = await supabase.from('facilities')
    .update({
      google_location_name: name,
      google_location_title: name ? (typeof location_title === 'string' ? location_title : null) : null,
    })
    .eq('id', facility_id)
    .eq('user_id', user.id)
  if (error) {
    return NextResponse.json({
      error: isMissingColumn(error, 'google_location_name')
        ? 'Supabaseで supabase/add-google-business.sql を実行してください。'
        : error.message,
    }, { status: 400 })
  }
  return NextResponse.json({ success: true })
}
