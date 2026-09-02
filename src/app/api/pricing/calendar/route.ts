import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getRoomCalendar } from '@/lib/beds24/client'
import { resolveBeds24Token } from '@/lib/ota/token'
import { canManage } from '@/lib/auth/can-manage'

// 部屋の料金カレンダー（価格・最低宿泊日数）を取得
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const facilityId = searchParams.get('facility_id')
  const roomId = searchParams.get('room_id')
  const start = searchParams.get('start')
  const end = searchParams.get('end')
  if (!facilityId || !roomId || !start || !end) {
    return NextResponse.json({ error: 'facility_id / room_id / start / end は必須です' }, { status: 400 })
  }

  const { data: facility } = await supabase
    .from('facilities')
    .select('id, ota_account_id')
    .eq('id', facilityId)
    .single()
  if (!facility) return NextResponse.json({ error: '施設が見つかりません' }, { status: 404 })
  if (!(await canManage(supabase, facility.id, user.id))) {
    return NextResponse.json({ error: 'この操作を行う権限がありません' }, { status: 403 })
  }

  const { token } = await resolveBeds24Token(supabase, user.id, facility)
  if (!token) return NextResponse.json({ error: 'Beds24のトークンが設定されていません' }, { status: 400 })

  try {
    const days = await getRoomCalendar(token, roomId, start, end)
    return NextResponse.json({ days })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: `カレンダーの取得に失敗しました: ${msg}` }, { status: 502 })
  }
}
