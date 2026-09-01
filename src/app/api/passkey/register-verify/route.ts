import { NextResponse } from 'next/server'
import { verifyRegistrationResponse } from '@simplewebauthn/server'
import type { RegistrationResponseJSON } from '@simplewebauthn/server'
import { createClient } from '@supabase/supabase-js'
import { getRpID, getOrigin } from '@/lib/passkey/config'
import { sendCheckinQrEmail } from '@/lib/brevo/emails'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const { guest_record_id, credential }: { guest_record_id: string; credential: RegistrationResponseJSON } =
      await request.json()

    if (!guest_record_id || !credential) {
      return NextResponse.json({ error: '必須パラメータが不足しています' }, { status: 400 })
    }

    // チャレンジを取得（expires_at が null の行も拾えるよう or 条件にする）
    const { data: challengeRecord, error: challengeError } = await supabase
      .from('passkey_challenges')
      .select('id, challenge, expires_at')
      .eq('type', 'registration')
      .eq('guest_record_id', guest_record_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (challengeError || !challengeRecord) {
      console.error('challenge lookup error:', challengeError, 'guest_record_id:', guest_record_id)
      return NextResponse.json({ error: 'チャレンジが見つかりません。もう一度最初からお試しください。' }, { status: 400 })
    }

    // expires_at がある場合のみ期限チェック
    if (challengeRecord.expires_at && new Date(challengeRecord.expires_at) < new Date()) {
      return NextResponse.json({ error: 'チャレンジの期限が切れました。もう一度最初からお試しください。' }, { status: 400 })
    }

    // 登録レスポンスを検証
    const verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge: challengeRecord.challenge,
      expectedOrigin: getOrigin(),
      expectedRPID: getRpID(),
    })

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json({ error: 'パスキーの検証に失敗しました' }, { status: 400 })
    }

    const { registrationInfo } = verification

    // publicKey を base64 で保存
    const publicKeyBase64 = Buffer.from(registrationInfo.credential.publicKey).toString('base64')

    // guest_records にパスキー情報を保存
    const { error: updateError } = await supabase
      .from('guest_records')
      .update({
        passkey_credential_id: registrationInfo.credential.id,
        passkey_public_key: publicKeyBase64,
        passkey_counter: 0,
        passkey_registered_at: new Date().toISOString(),
      })
      .eq('id', guest_record_id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // チャレンジを削除
    await supabase.from('passkey_challenges').delete().eq('id', challengeRecord.id)

    // メール送信用データを取得
    const { data: guestRecord } = await supabase
      .from('guest_records')
      .select('email, full_name, booking_id')
      .eq('id', guest_record_id)
      .single()

    if (guestRecord) {
      const { data: booking } = await supabase
        .from('bookings')
        .select('checkin_date, guest_qr_token, facility_id')
        .eq('id', guestRecord.booking_id)
        .single()

      if (booking) {
        const { data: facility } = await supabase
          .from('facilities')
          .select('name, emergency_contact')
          .eq('id', booking.facility_id)
          .single()

        if (facility) {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
          await sendCheckinQrEmail({
            to: guestRecord.email,
            guestName: guestRecord.full_name,
            guestQrToken: booking.guest_qr_token,
            propertyName: facility.name,
            checkinDate: booking.checkin_date,
            emergencyContact: facility.emergency_contact,
            appUrl,
          })
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('register-verify error:', e)
    return NextResponse.json({ error: 'パスキーの登録に失敗しました' }, { status: 500 })
  }
}
