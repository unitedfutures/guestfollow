import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { createClient } from '@supabase/supabase-js'

// 公開エンドポイント（認証不要）— service_role で RLS をバイパス
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const ALLOWED_IMAGE: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const isDate = (v: unknown) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)

// 画像の形式・サイズを検証し、拡張子（MIME由来）を返す。不正なら null
function validateImage(file: File | null): { ok: true; ext: string } | { ok: false; error: string } | null {
  if (!file || file.size === 0) return null
  const ext = ALLOWED_IMAGE[file.type]
  if (!ext) return { ok: false, error: '画像はJPEG/PNG/WebPのみ対応しています' }
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, error: '画像サイズは5MB以下にしてください' }
  return { ok: true, ext }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const qrSlug      = formData.get('qr_slug') as string
    let basic: Record<string, unknown>, booking: Record<string, unknown>, passport: Record<string, unknown>
    try {
      basic    = JSON.parse(String(formData.get('basic') ?? '{}'))
      booking  = JSON.parse(String(formData.get('booking') ?? '{}'))
      passport = JSON.parse(String(formData.get('passport') ?? '{}'))
    } catch {
      return NextResponse.json({ error: '入力データの形式が不正です' }, { status: 400 })
    }
    const passportFile = formData.get('passport_image') as File | null
    const faceFile    = formData.get('face_photo') as File | null

    if (!qrSlug || !basic?.full_name || !basic?.email || !isDate(booking?.checkin_date) || !isDate(booking?.checkout_date)) {
      return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 })
    }
    if (String(booking.checkout_date) <= String(booking.checkin_date)) {
      return NextResponse.json({ error: 'チェックアウト日はチェックイン日より後にしてください' }, { status: 400 })
    }
    const passportCheck = validateImage(passportFile)
    if (passportCheck && !passportCheck.ok) return NextResponse.json({ error: passportCheck.error }, { status: 400 })
    const faceCheck = validateImage(faceFile)
    if (faceCheck && !faceCheck.ok) return NextResponse.json({ error: faceCheck.error }, { status: 400 })

    // 施設を qr_slug で検索
    const { data: facility, error: facilityError } = await supabase
      .from('facilities')
      .select('id, user_id, name, emergency_contact')
      .eq('qr_slug', qrSlug)
      .single()

    if (facilityError || !facility) {
      return NextResponse.json({ error: '施設が見つかりません' }, { status: 404 })
    }

    // 予約レコードを作成（オーナーの user_id を使用）
    const { data: newBooking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        facility_id:  facility.id,
        user_id:      facility.user_id,
        guest_name:   basic.full_name,
        guest_email:  basic.email,
        checkin_date:  booking.checkin_date,
        checkout_date: booking.checkout_date,
        num_guests:    booking.num_guests || 1,
        status:       'pre_checkin_done',
      })
      .select('id, guest_qr_token')
      .single()

    if (bookingError || !newBooking) {
      return NextResponse.json({ error: bookingError?.message ?? '予約の作成に失敗しました' }, { status: 500 })
    }

    // パスポート画像アップロード（拡張子はMIME由来。ファイル名は信用しない）
    let passport_image_path: string | null = null
    if (passportFile && passportCheck?.ok && basic.is_foreign) {
      const arrayBuffer = await passportFile.arrayBuffer()
      const path = `${newBooking.id}/${Date.now()}.${passportCheck.ext}`
      const { error: uploadError } = await supabase.storage
        .from('passport-images')
        .upload(path, Buffer.from(arrayBuffer), { contentType: passportFile.type, upsert: true })
      if (!uploadError) passport_image_path = path
    }

    // 顔写真アップロード
    let face_photo_path: string | null = null
    if (faceFile && faceCheck?.ok) {
      const arrayBuffer = await faceFile.arrayBuffer()
      const path = `${newBooking.id}/face_${Date.now()}.${faceCheck.ext}`
      const { error: uploadError } = await supabase.storage
        .from('passport-images')
        .upload(path, Buffer.from(arrayBuffer), { contentType: faceFile.type, upsert: true })
      if (!uploadError) face_photo_path = path
    }

    // パスキー登録をこのブラウザ（本人）に紐づけるためのセットアップトークン
    const passkeySetupToken = randomBytes(24).toString('hex')

    // IPアドレス取得
    const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown'

    // guest_records に保存
    const { data: guestRecord, error: recordError } = await supabase
      .from('guest_records')
      .insert({
        booking_id:           newBooking.id,
        facility_id:          facility.id,
        full_name:            basic.full_name,
        email:                basic.email,
        phone:                basic.phone || null,
        address:              basic.address || null,
        age:                  basic.age ?? null,
        nationality:          basic.is_foreign ? passport.nationality : (basic.nationality || null),
        num_guests:           booking.num_guests || 1,
        is_foreign:           basic.is_foreign,
        passport_number:      basic.is_foreign ? passport.passport_number : null,
        passport_image_path,
        face_photo_path,
        checkin_time:         booking.checkin_time || null,
        checkout_time:        booking.checkout_time || null,
        previous_location:    booking.previous_location || null,
        next_destination:     booking.next_destination || null,
        terms_agreed_at:      new Date().toISOString(),
        terms_ip_address:     ip,
        passkey_setup_token:  passkeySetupToken,
      })
      .select('id')
      .single()

    if (recordError || !guestRecord) {
      return NextResponse.json({ error: recordError?.message ?? 'ゲスト情報の保存に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({ success: true, guest_record_id: guestRecord.id, passkey_setup_token: passkeySetupToken })
  } catch (e) {
    console.error('[/api/register] error:', e)
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}
