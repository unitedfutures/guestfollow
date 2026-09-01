import { NextResponse } from 'next/server'
import { generateAuthenticationOptions } from '@simplewebauthn/server'
import { createClient } from '@supabase/supabase-js'
import { getRpID } from '@/lib/passkey/config'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const { facility_id } = await request.json()

    if (!facility_id) {
      return NextResponse.json({ error: 'facility_id is required' }, { status: 400 })
    }

    const today = new Date().toISOString().split('T')[0]

    // 今日チェックイン予定のゲストのパスキー credential_id を取得
    const { data: guestRecords, error: recordsError } = await supabase
      .from('guest_records')
      .select('passkey_credential_id, booking_id, bookings!inner(checkin_date, facility_id, status)')
      .eq('bookings.facility_id', facility_id)
      .not('passkey_credential_id', 'is', null)

    if (recordsError) {
      return NextResponse.json({ error: recordsError.message }, { status: 500 })
    }

    // checkin_date が今日かつ status が pre_checkin_done のもの
    const allowCredentials = (guestRecords || [])
      .filter((r) => {
        const booking = (r.bookings as unknown as { checkin_date: string; facility_id: string; status: string })
        return booking.checkin_date === today && booking.status === 'pre_checkin_done'
      })
      .map((r) => ({ id: r.passkey_credential_id as string }))

    const options = await generateAuthenticationOptions({
      rpID: getRpID(),
      userVerification: 'required',
      allowCredentials,
    })

    // チャレンジを保存
    const { error: insertError } = await supabase.from('passkey_challenges').insert({
      challenge: options.challenge,
      type: 'authentication',
      facility_id,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    })

    if (insertError) {
      console.error('passkey_challenges insert error (auth):', insertError)
      return NextResponse.json({ error: `チャレンジの保存に失敗しました: ${insertError.message}` }, { status: 500 })
    }

    return NextResponse.json(options)
  } catch (e) {
    console.error('auth-options error:', e)
    return NextResponse.json({ error: '認証オプションの生成に失敗しました' }, { status: 500 })
  }
}
