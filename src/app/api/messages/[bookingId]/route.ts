import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { postMessage } from '@/lib/beds24/client'
import { resolveBeds24Token } from '@/lib/ota/token'
import { canManage } from '@/lib/auth/can-manage'

// 予約単位のメッセージ一覧を取得（既読化も実施）
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  const { bookingId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: messages } = await supabase
    .from('messages')
    .select('id, direction, source, body, sent_at, read, ota_source')
    .eq('booking_id', bookingId)
    .order('sent_at', { ascending: true })

  // 受信メッセージを既読化
  await supabase
    .from('messages')
    .update({ read: true })
    .eq('booking_id', bookingId)
    .eq('direction', 'incoming')
    .eq('read', false)

  return NextResponse.json(messages ?? [])
}

// メッセージ送信
export async function POST(
  req: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  const { bookingId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { body } = await req.json()
  if (!body?.trim()) return NextResponse.json({ error: 'メッセージを入力してください' }, { status: 400 })

  const { data: booking } = await supabase
    .from('bookings')
    .select('id, facility_id, ota_source, beds24_booking_id, facilities(ota_account_id)')
    .eq('id', bookingId)
    .single()

  if (!booking) return NextResponse.json({ error: '予約が見つかりません' }, { status: 404 })
  // 送信はオーナー/現場管理責任者のみ（清掃担当者は不可）。Beds24へ送る前に判定する
  if (!(await canManage(supabase, booking.facility_id, user.id))) {
    return NextResponse.json({ error: 'この操作を行う権限がありません' }, { status: 403 })
  }

  if (booking.ota_source !== 'beds24' || !booking.beds24_booking_id) {
    return NextResponse.json({
      error: 'この予約はメッセージ送信に対応していません（Beds24のOTA予約のみ対応）',
    }, { status: 400 })
  }

  const facility = Array.isArray(booking.facilities) ? booking.facilities[0] : booking.facilities
  const { token, source } = await resolveBeds24Token(supabase, user.id, facility ?? {})
  if (!token) {
    return NextResponse.json({ error: 'Beds24のトークンが設定されていません' }, { status: 400 })
  }
  if (source === 'longlife') {
    // Long Life Token は読み取り専用のため送信不可。設定を促す。
    return NextResponse.json({
      error: 'メッセージ送信には書き込み権限が必要です。設定 → サイトコントローラー連携で、invite codeから発行した「Refresh Token」を設定してください（Long Life Tokenは読み取り専用のため送信できません）。',
    }, { status: 400 })
  }

  try {
    await postMessage(token, booking.beds24_booking_id, body.trim())
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: `送信に失敗しました: ${msg}` }, { status: 502 })
  }

  // ローカルにも記録
  const { data: inserted } = await supabase
    .from('messages')
    .insert({
      booking_id: booking.id,
      facility_id: booking.facility_id,
      user_id: user.id,
      ota_source: 'beds24',
      ota_message_id: null,
      direction: 'outgoing',
      source: 'host',
      body: body.trim(),
      sent_at: new Date().toISOString(),
      read: true,
    })
    .select('id, direction, source, body, sent_at, read, ota_source')
    .single()

  return NextResponse.json({ success: true, message: inserted })
}
