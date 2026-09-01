import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// 公開エンドポイント（認証不要）
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { qr_slug, respondent_name, respondent_email, stay_checkin, stay_checkout, answers } = body

    if (!qr_slug) return NextResponse.json({ error: 'qr_slug is required' }, { status: 400 })

    const { data: facility, error: facilityError } = await supabase
      .from('facilities')
      .select('id, user_id')
      .eq('qr_slug', qr_slug)
      .single()

    if (facilityError || !facility) {
      return NextResponse.json({ error: '施設が見つかりません' }, { status: 404 })
    }

    const { data: inserted, error } = await supabase.from('survey_responses').insert({
      facility_id:      facility.id,
      user_id:          facility.user_id,
      respondent_name:  respondent_name ?? null,
      respondent_email: respondent_email ?? null,
      stay_checkin:     stay_checkin ?? null,
      stay_checkout:    stay_checkout ?? null,
      answers:          answers ?? {},
    }).select('id').single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, id: inserted?.id })
  } catch (e) {
    console.error('[/api/survey] error:', e)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}

// ☆4以下のときの「改善点」を後追いで保存する
export async function PATCH(request: Request) {
  try {
    const { id, improvement } = await request.json()
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const { data: row, error: readErr } = await supabase
      .from('survey_responses')
      .select('answers')
      .eq('id', id)
      .single()
    if (readErr || !row) return NextResponse.json({ error: '回答が見つかりません' }, { status: 404 })

    const answers = { ...(row.answers ?? {}), improvement: improvement ?? null }
    const { error } = await supabase.from('survey_responses').update({ answers }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[/api/survey PATCH] error:', e)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}
