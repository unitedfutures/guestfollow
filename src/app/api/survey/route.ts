import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isMissingColumn } from '@/lib/beds24/sync-write'

// 公開エンドポイント（認証不要）
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { qr_slug, respondent_name, respondent_email, stay_checkin, stay_checkout, answers, booking_id } = body

    if (!qr_slug) return NextResponse.json({ error: 'qr_slug is required' }, { status: 400 })

    // 入力検証（公開エンドポイントのため上限・形式を制限）
    const isDate = (v: unknown) => v == null || (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v))
    if (answers != null && (typeof answers !== 'object' || Array.isArray(answers))) {
      return NextResponse.json({ error: 'answers が不正です' }, { status: 400 })
    }
    if (answers && JSON.stringify(answers).length > 10_000) {
      return NextResponse.json({ error: '回答が長すぎます' }, { status: 400 })
    }
    if (!isDate(stay_checkin) || !isDate(stay_checkout)) {
      return NextResponse.json({ error: '日付の形式が不正です' }, { status: 400 })
    }
    if (respondent_name != null && (typeof respondent_name !== 'string' || respondent_name.length > 100)) {
      return NextResponse.json({ error: 'お名前が長すぎます' }, { status: 400 })
    }
    if (respondent_email != null && (typeof respondent_email !== 'string' || respondent_email.length > 254)) {
      return NextResponse.json({ error: 'メールアドレスが不正です' }, { status: 400 })
    }

    const { data: facility, error: facilityError } = await supabase
      .from('facilities')
      .select('id, user_id')
      .eq('qr_slug', qr_slug)
      .single()

    if (facilityError || !facility) {
      return NextResponse.json({ error: '施設が見つかりません' }, { status: 404 })
    }

    // 個別URLからの回答は予約に紐づける（他施設の予約IDを渡されても紐づけない）
    let bookingId: string | null = null
    if (typeof booking_id === 'string' && /^[0-9a-f-]{36}$/i.test(booking_id)) {
      const { data: booking } = await supabase
        .from('bookings').select('id').eq('id', booking_id).eq('facility_id', facility.id).maybeSingle()
      bookingId = booking?.id ?? null
    }

    const { data: inserted, error } = await supabase.from('survey_responses').insert({
      facility_id:      facility.id,
      ...(bookingId ? { booking_id: bookingId } : {}),
      user_id:          facility.user_id,
      respondent_name:  respondent_name ?? null,
      respondent_email: respondent_email ?? null,
      stay_checkin:     stay_checkin ?? null,
      stay_checkout:    stay_checkout ?? null,
      answers:          answers ?? {},
    }).select('id').single()

    if (error) {
      // booking_id 列がまだ無い環境では、紐づけなしで保存する
      if (isMissingColumn(error, 'booking_id')) {
        const { data: retry, error: retryError } = await supabase.from('survey_responses').insert({
          facility_id:      facility.id,
          user_id:          facility.user_id,
          respondent_name:  respondent_name ?? null,
          respondent_email: respondent_email ?? null,
          stay_checkin:     stay_checkin ?? null,
          stay_checkout:    stay_checkout ?? null,
          answers:          answers ?? {},
        }).select('id').single()
        if (retryError) return NextResponse.json({ error: retryError.message }, { status: 500 })
        return NextResponse.json({ success: true, id: retry?.id })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true, id: inserted?.id })
  } catch (e) {
    console.error('[/api/survey] error:', e)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}

// ☆4以下のときの「改善点」を後追いで保存する
export async function PATCH(request: Request) {
  try {
    const { id, qr_slug, improvement } = await request.json()
    if (!id || !qr_slug) return NextResponse.json({ error: 'id と qr_slug は必須です' }, { status: 400 })
    if (improvement != null && (typeof improvement !== 'string' || improvement.length > 2000)) {
      return NextResponse.json({ error: '改善点が不正です' }, { status: 400 })
    }

    // 回答を作成した施設（qr_slug）と一致する行のみ更新可。改善点は一度だけ書き込める
    const { data: facility } = await supabase
      .from('facilities')
      .select('id')
      .eq('qr_slug', qr_slug)
      .maybeSingle()
    if (!facility) return NextResponse.json({ error: '施設が見つかりません' }, { status: 404 })

    const { data: row, error: readErr } = await supabase
      .from('survey_responses')
      .select('answers')
      .eq('id', id)
      .eq('facility_id', facility.id)
      .maybeSingle()
    if (readErr || !row) return NextResponse.json({ error: '回答が見つかりません' }, { status: 404 })
    if (row.answers && row.answers.improvement != null && row.answers.improvement !== '') {
      return NextResponse.json({ error: '改善点はすでに送信済みです' }, { status: 409 })
    }

    const answers = { ...(row.answers ?? {}), improvement: improvement ?? null }
    const { error } = await supabase.from('survey_responses').update({ answers }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[/api/survey PATCH] error:', e)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}
