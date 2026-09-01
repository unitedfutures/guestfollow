import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { updateRoomCalendar } from '@/lib/beds24/client'
import { resolveBeds24Token } from '@/lib/ota/token'

type DayInput = { date: string; price?: number | null; minStay?: number | null }

// 料金カレンダーをBeds24へ反映（価格・最低宿泊日数）。書き込みスコープ必須。
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { facility_id, room_id, days } = await request.json()
  if (!facility_id || !room_id || !Array.isArray(days) || days.length === 0) {
    return NextResponse.json({ error: 'facility_id / room_id / days は必須です' }, { status: 400 })
  }

  const { data: facility } = await supabase
    .from('facilities')
    .select('id, ota_account_id')
    .eq('id', facility_id)
    .single()
  if (!facility) return NextResponse.json({ error: '施設が見つかりません' }, { status: 404 })

  const { token, source } = await resolveBeds24Token(supabase, user.id, facility)
  if (!token) return NextResponse.json({ error: 'Beds24のトークンが設定されていません' }, { status: 400 })
  if (source !== 'refresh') {
    return NextResponse.json({
      error: '価格の更新には書き込み権限が必要です。設定 → サイトコントローラー連携で、write:inventory スコープを含む invite code から「Refresh Token」を設定してください（読み取り専用のLong Life Tokenでは更新できません）。',
    }, { status: 400 })
  }

  // 入力を検証・整形
  const clean: DayInput[] = []
  for (const d of days as DayInput[]) {
    if (!d?.date || !/^\d{4}-\d{2}-\d{2}$/.test(d.date)) continue
    const entry: DayInput = { date: d.date }
    if (d.price != null && Number.isFinite(Number(d.price)) && Number(d.price) >= 0) entry.price = Math.round(Number(d.price))
    if (d.minStay != null && Number(d.minStay) >= 1) entry.minStay = Math.floor(Number(d.minStay))
    if (entry.price == null && entry.minStay == null) continue
    clean.push(entry)
  }
  if (clean.length === 0) {
    return NextResponse.json({ error: '反映できる有効なデータがありません' }, { status: 400 })
  }

  try {
    await updateRoomCalendar(token, room_id, clean)
    return NextResponse.json({ success: true, updated: clean.length })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: `Beds24への反映に失敗しました: ${msg}` }, { status: 502 })
  }
}
