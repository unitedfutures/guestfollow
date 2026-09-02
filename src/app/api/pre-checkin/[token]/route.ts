import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { createServiceRoleClient } from '@/lib/supabase/server'

// 公開エンドポイント（認証不要）。秘密の pre_checkin_token で予約を特定し、
// 宿泊者名簿を保存する。RLS をバイパスする service role を使うため、
// 予約の特定は必ずトークンで行い、書き込みはその予約に限定する。
const ALLOWED_IMAGE: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
const MAX_IMAGE_BYTES = 5 * 1024 * 1024

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params
    if (!token) return NextResponse.json({ error: 'token is required' }, { status: 400 })
    const supabase = createServiceRoleClient()

    const { data: booking } = await supabase
      .from('bookings')
      .select('id, facility_id, status')
      .eq('pre_checkin_token', token)
      .maybeSingle()

    if (!booking) return NextResponse.json({ error: '予約が見つかりません' }, { status: 404 })
    if (booking.status !== 'pending' && booking.status !== 'pre_checkin_sent') {
      return NextResponse.json({ error: 'すでに登録済みです' }, { status: 400 })
    }

    const formData = await request.formData()
    let basic: Record<string, unknown>
    let passport: Record<string, unknown>
    try {
      basic = JSON.parse(String(formData.get('basic') ?? '{}'))
      passport = JSON.parse(String(formData.get('passport') ?? '{}'))
    } catch {
      return NextResponse.json({ error: '入力データの形式が不正です' }, { status: 400 })
    }
    if (!basic || typeof basic !== 'object' || !basic.full_name || !basic.email) {
      return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 })
    }
    const passportFile = formData.get('passport_image') as File | null

    // IPアドレス取得
    const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown'

    // パスポート画像アップロード（形式・サイズを検証。拡張子はMIMEから決める）
    let passport_image_path: string | null = null
    if (passportFile && basic.is_foreign) {
      const ext = ALLOWED_IMAGE[passportFile.type]
      if (!ext) return NextResponse.json({ error: '画像はJPEG/PNG/WebPのみ対応しています' }, { status: 400 })
      if (passportFile.size > MAX_IMAGE_BYTES) return NextResponse.json({ error: '画像サイズは5MB以下にしてください' }, { status: 400 })
      const buffer = Buffer.from(await passportFile.arrayBuffer())
      const path = `${booking.id}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('passport-images')
        .upload(path, buffer, { contentType: passportFile.type, upsert: true })
      if (!uploadError) passport_image_path = path
    }

    // パスキー登録をこのブラウザ（本人）に紐づけるためのセットアップトークン
    const passkeySetupToken = randomBytes(24).toString('hex')

    // guest_records に保存
    const { data: insertedRecord, error: recordError } = await supabase.from('guest_records').insert({
      booking_id: booking.id,
      facility_id: booking.facility_id,
      full_name: String(basic.full_name),
      address: basic.address ? String(basic.address) : null,
      phone: basic.phone ? String(basic.phone) : null,
      email: String(basic.email),
      num_guests: Number(basic.num_guests) || 1,
      is_foreign: !!basic.is_foreign,
      nationality: basic.is_foreign ? (passport.nationality ? String(passport.nationality) : null) : null,
      passport_number: basic.is_foreign ? (passport.passport_number ? String(passport.passport_number) : null) : null,
      passport_image_path,
      terms_agreed_at: new Date().toISOString(),
      terms_ip_address: ip,
      passkey_setup_token: passkeySetupToken,
    }).select('id').single()

    if (recordError || !insertedRecord) {
      return NextResponse.json({ error: recordError?.message ?? '登録に失敗しました' }, { status: 500 })
    }

    // booking ステータス更新（更新できたか確認）
    const { data: updated, error: updErr } = await supabase.from('bookings')
      .update({ status: 'pre_checkin_done', updated_at: new Date().toISOString() })
      .eq('id', booking.id)
      .select('id')
    if (updErr || !updated?.length) {
      return NextResponse.json({ error: '予約ステータスの更新に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({ success: true, guest_record_id: insertedRecord.id, passkey_setup_token: passkeySetupToken })
  } catch (e) {
    console.error('[/api/pre-checkin] error:', e)
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}
