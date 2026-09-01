import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getRooms } from '@/lib/beds24/client'
import { resolveBeds24Token } from '@/lib/ota/token'

// 施設(Beds24物件)の部屋一覧を取得
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const facilityId = searchParams.get('facility_id')
  if (!facilityId) return NextResponse.json({ error: 'facility_id は必須です' }, { status: 400 })

  const { data: facility } = await supabase
    .from('facilities')
    .select('id, beds24_property_id, ota_account_id')
    .eq('id', facilityId)
    .single()
  if (!facility) return NextResponse.json({ error: '施設が見つかりません' }, { status: 404 })
  if (!facility.beds24_property_id) {
    return NextResponse.json({ error: 'この施設はBeds24と連携していません' }, { status: 400 })
  }

  const { token } = await resolveBeds24Token(supabase, user.id, facility)
  if (!token) return NextResponse.json({ error: 'Beds24のトークンが設定されていません' }, { status: 400 })

  try {
    const rooms = await getRooms(token, facility.beds24_property_id)
    return NextResponse.json({ rooms })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: `部屋情報の取得に失敗しました: ${msg}` }, { status: 502 })
  }
}
