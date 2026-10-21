import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getRoomCalendar, updateRoomCalendar } from '@/lib/beds24/client'
import { resolveBeds24Token } from '@/lib/ota/token'
import { canManage } from '@/lib/auth/can-manage'

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
  // 価格の書き込みはオーナー/現場管理責任者のみ（清掃担当者は不可）
  if (!(await canManage(supabase, facility.id, user.id))) {
    return NextResponse.json({ error: 'この操作を行う権限がありません' }, { status: 403 })
  }

  const { token, source } = await resolveBeds24Token(supabase, user.id, facility, 'write')
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
    const { warnings } = await updateRoomCalendar(token, room_id, clean)

    // 反映後にBeds24から読み直し、本当に書き込まれたか1日ずつ突き合わせる
    const dates = clean.map(d => d.date).sort()
    const verification = await verifyApplied(
      supabase, user.id, facility, room_id, clean, dates[0], dates[dates.length - 1]
    )

    return NextResponse.json({
      success: true,
      updated: clean.length,
      warnings,
      ...verification,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: `Beds24への反映に失敗しました: ${msg}` }, { status: 502 })
  }
}

/**
 * 反映直後にBeds24の値を読み直して、送った内容と一致するか確認する。
 * 読み取りは Long Life Token（読み取り用）で行う。
 */
async function verifyApplied(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  facility: { id: string; ota_account_id?: string | null },
  roomId: string,
  sent: DayInput[],
  from: string,
  to: string,
): Promise<{ verified: number; mismatches: { date: string; expected: string; actual: string }[]; verifyError?: string }> {
  const { token } = await resolveBeds24Token(supabase, userId, facility, 'read')
  if (!token) return { verified: 0, mismatches: [], verifyError: '確認用の読み取りトークンがありません' }

  try {
    const days = await getRoomCalendar(token, roomId, from, to)
    const actual = new Map(days.map(d => [d.date, d]))
    const mismatches: { date: string; expected: string; actual: string }[] = []
    let verified = 0

    for (const d of sent) {
      const got = actual.get(d.date)
      const priceOk = d.price == null || Math.round(got?.price ?? -1) === Math.round(d.price)
      const stayOk = d.minStay == null || (got?.minStay ?? -1) === d.minStay
      if (priceOk && stayOk) { verified++; continue }
      const fmt = (p: number | null | undefined, m: number | null | undefined) =>
        `${p != null ? `¥${Math.round(p).toLocaleString()}` : '—'} / ${m != null ? `${m}泊` : '—'}`
      mismatches.push({
        date: d.date,
        expected: fmt(d.price ?? null, d.minStay ?? null),
        actual: fmt(got?.price ?? null, got?.minStay ?? null),
      })
    }
    return { verified, mismatches }
  } catch (e) {
    return { verified: 0, mismatches: [], verifyError: e instanceof Error ? e.message : '確認に失敗しました' }
  }
}
