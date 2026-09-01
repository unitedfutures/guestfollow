import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generatePin } from '@/lib/utils'
import { createAccessCode } from '@/lib/remotelock/client'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { facility_id, guest_qr_token, face_photo } = await request.json()

  if (!facility_id || !guest_qr_token) {
    return NextResponse.json({ error: '必須パラメータが不足しています' }, { status: 400 })
  }

  const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown'
  const now = new Date().toISOString()

  // 予約を guest_qr_token と facility_id で照合
  const { data: booking } = await supabase
    .from('bookings')
    .select('*, facilities(remote_lock_device_id, pin_code)')
    .eq('guest_qr_token', guest_qr_token)
    .eq('facility_id', facility_id)
    .single()

  if (!booking) {
    return NextResponse.json({ error: '予約が見つかりません。QRコードを確認してください。' }, { status: 404 })
  }

  if (booking.status !== 'pre_checkin_done') {
    if (booking.status === 'checked_in') {
      // すでにチェックイン済みの場合はPINを返す
      const { data: code } = await supabase
        .from('access_codes')
        .select('code')
        .eq('booking_id', booking.id)
        .order('issued_at', { ascending: false })
        .limit(1)
        .single()
      if (code) return NextResponse.json({ pin_code: code.code })
    }
    return NextResponse.json({
      error: booking.status === 'pending' || booking.status === 'pre_checkin_sent'
        ? '事前登録が完了していません。メールのリンクから事前登録を行ってください。'
        : 'この予約はすでに処理済みです。'
    }, { status: 400 })
  }

  // チェックイン日の確認
  const today = new Date().toISOString().split('T')[0]
  if (booking.checkin_date > today) {
    return NextResponse.json({
      error: `チェックイン日（${booking.checkin_date}）より前のため入室できません。`
    }, { status: 400 })
  }
  if (booking.checkout_date < today) {
    return NextResponse.json({ error: 'チェックアウト日を過ぎています。' }, { status: 400 })
  }

  // 顔写真を保存
  let face_photo_path: string | null = null
  if (face_photo && face_photo.startsWith('data:image/')) {
    const base64Data = face_photo.split(',')[1]
    const buffer = Buffer.from(base64Data, 'base64')
    const path = `${booking.id}/${Date.now()}.jpg`

    const { error: uploadError } = await supabase.storage
      .from('face-photos')
      .upload(path, buffer, { contentType: 'image/jpeg', upsert: true })

    if (!uploadError) face_photo_path = path
  }

  // 暗証番号：施設に固定PINが設定されていればそれを使用、なければランダム4桁
  const facility = booking.facilities as unknown as { remote_lock_device_id: string | null; pin_code: string | null }
  const pin_code = facility?.pin_code?.trim() || generatePin(4)

  // access_codes に保存
  const checkoutDate = new Date(booking.checkout_date)
  checkoutDate.setHours(23, 59, 59)

  let remoteLockResponse = null

  // RemoteLOCK 連携（device_id が設定されている場合）
  if (facility?.remote_lock_device_id) {
    try {
      remoteLockResponse = await createAccessCode({
        deviceId: facility.remote_lock_device_id,
        name: `GuestFollow-${booking.id.slice(0, 8)}`,
        pin: pin_code,
        startsAt: now,
        endsAt: checkoutDate.toISOString(),
      })
    } catch (e) {
      console.error('RemoteLOCK error:', e)
      // RemoteLOCK失敗でもチェックインは続行（固定PINを表示）
    }
  }

  await supabase.from('access_codes').insert({
    booking_id: booking.id,
    facility_id,
    code: pin_code,
    issued_at: now,
    expires_at: checkoutDate.toISOString(),
    remote_lock_response: remoteLockResponse,
  })

  // guest_records を更新（顔写真・チェックイン記録）
  await supabase.from('guest_records')
    .update({
      face_photo_path,
      checkin_qr_scanned_at: now,
      checkin_ip_address: ip,
      checkin_completed_at: now,
    })
    .eq('booking_id', booking.id)

  // booking ステータスを checked_in に更新
  await supabase.from('bookings')
    .update({ status: 'checked_in', updated_at: now })
    .eq('id', booking.id)

  return NextResponse.json({ pin_code })
}
