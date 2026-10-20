import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getAccessToken, replyToReview } from '@/lib/google/business'
import { loadGoogleSettings, toCredentials } from '@/lib/google/credentials'

// クチコミに返信する（Googleへ送信し、保存済みのレビューも更新する）
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { review_id, comment } = await request.json().catch(() => ({}))
  const body = typeof comment === 'string' ? comment.trim() : ''
  if (typeof review_id !== 'string' || !review_id) {
    return NextResponse.json({ error: 'review_id は必須です' }, { status: 400 })
  }
  if (!body) return NextResponse.json({ error: '返信内容を入力してください' }, { status: 400 })
  // Googleの返信は4096文字まで
  if (body.length > 4096) return NextResponse.json({ error: '返信は4096文字以内で入力してください' }, { status: 400 })

  const { data: review } = await supabase
    .from('google_reviews')
    .select('id, review_name')
    .eq('id', review_id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!review) return NextResponse.json({ error: 'クチコミが見つかりません' }, { status: 404 })

  const cred = toCredentials(await loadGoogleSettings(supabase, user.id))
  if (!cred) return NextResponse.json({ error: 'Googleと連携されていません' }, { status: 400 })

  try {
    const token = await getAccessToken(cred)
    const { updateTime } = await replyToReview(token, review.review_name as string, body)
    await supabase.from('google_reviews')
      .update({ reply_comment: body, reply_update_time: updateTime ?? new Date().toISOString() })
      .eq('id', review.id)
    return NextResponse.json({ success: true, reply_comment: body })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : '返信に失敗しました' }, { status: 502 })
  }
}
