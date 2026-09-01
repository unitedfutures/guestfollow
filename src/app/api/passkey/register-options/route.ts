import { NextResponse } from 'next/server'
import { generateRegistrationOptions } from '@simplewebauthn/server'
import { createClient } from '@supabase/supabase-js'
import { rpName, getRpID } from '@/lib/passkey/config'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const { guest_record_id } = await request.json()

    if (!guest_record_id) {
      return NextResponse.json({ error: 'guest_record_id is required' }, { status: 400 })
    }

    // guest_records から full_name を取得
    const { data: guestRecord, error: guestError } = await supabase
      .from('guest_records')
      .select('full_name')
      .eq('id', guest_record_id)
      .single()

    if (guestError || !guestRecord) {
      return NextResponse.json({ error: '宿泊者情報が見つかりません' }, { status: 404 })
    }

    const options = await generateRegistrationOptions({
      rpName,
      rpID: getRpID(),
      userID: new TextEncoder().encode(guest_record_id),
      userName: guestRecord.full_name,
      attestationType: 'none',
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'required',
      },
    })

    // チャレンジを passkey_challenges テーブルに保存
    const { error: insertError } = await supabase.from('passkey_challenges').insert({
      challenge: options.challenge,
      type: 'registration',
      guest_record_id,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    })

    if (insertError) {
      console.error('passkey_challenges insert error:', insertError)
      return NextResponse.json(
        { error: `チャレンジの保存に失敗しました: ${insertError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json(options)
  } catch (e) {
    console.error('register-options error:', e)
    return NextResponse.json({ error: 'パスキー登録オプションの生成に失敗しました' }, { status: 500 })
  }
}
