import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getAccessToken, listReviews } from '@/lib/google/business'
import { loadGoogleSettings, toCredentials } from '@/lib/google/credentials'

// Googleから各施設のクチコミを取り込む（返信状況も同期する）
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const cred = toCredentials(await loadGoogleSettings(supabase, user.id))
  if (!cred) return NextResponse.json({ error: 'Googleと連携されていません' }, { status: 400 })

  const { data: facilities, error: facilityError } = await supabase
    .from('facilities')
    .select('id, name, google_location_name')
    .eq('user_id', user.id)
    .not('google_location_name', 'is', null)
  if (facilityError) return NextResponse.json({ error: facilityError.message }, { status: 400 })
  if (!facilities?.length) {
    return NextResponse.json({ error: 'Googleのロケーションを紐づけた施設がありません' }, { status: 400 })
  }

  let token: string
  try {
    token = await getAccessToken(cred)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : '認証に失敗しました' }, { status: 502 })
  }

  let synced = 0
  const errors: string[] = []
  for (const f of facilities) {
    try {
      const reviews = await listReviews(token, f.google_location_name as string)
      for (const r of reviews) {
        if (!r.name) continue
        const { error } = await supabase.from('google_reviews').upsert({
          user_id: user.id,
          facility_id: f.id,
          review_name: r.name,
          reviewer_name: r.reviewerName || null,
          reviewer_photo_url: r.reviewerPhotoUrl || null,
          star_rating: r.starRating || null,
          comment: r.comment || null,
          review_create_time: r.createTime,
          review_update_time: r.updateTime,
          reply_comment: r.replyComment,
          reply_update_time: r.replyUpdateTime,
          synced_at: new Date().toISOString(),
        }, { onConflict: 'review_name' })
        if (error) { errors.push(`${f.name}: ${error.message}`); continue }
        synced++
      }
    } catch (e) {
      errors.push(`${f.name}: ${e instanceof Error ? e.message : '取得に失敗しました'}`)
    }
  }

  return NextResponse.json({ success: errors.length === 0, synced, errors })
}
