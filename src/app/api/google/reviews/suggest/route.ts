import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { HIGHLIGHT_LABELS_JA, isHighlightKey } from '@/lib/survey/highlights'

// クチコミへの返信文をAIで提案する。
// ゲストが書いた良かった点に触れつつ、施設の設備・サービスも盛り込む。

const STAR_NOTE: Record<number, string> = {
  5: '高評価のお礼を中心に、また来ていただけるよう温かく締めくくる',
  4: 'お礼を述べつつ、物足りなかった点があれば改善に努める姿勢を示す',
  3: 'お礼とともに、期待に届かなかった点をお詫びし、改善を約束する',
  2: 'まずお詫びを述べ、具体的に改善する姿勢を示す。言い訳はしない',
  1: '深くお詫びし、真摯に改善する姿勢を示す。反論や言い訳はしない',
}

/** アンケートでよく選ばれている「良かった点」を施設の強みとして渡す */
async function facilityStrengths(
  supabase: Awaited<ReturnType<typeof createClient>>, facilityId: string
): Promise<string[]> {
  const { data } = await supabase
    .from('survey_responses')
    .select('answers')
    .eq('facility_id', facilityId)
    .limit(300)
  const counts = new Map<string, number>()
  for (const row of data ?? []) {
    const highlights = (row.answers as { highlights?: unknown })?.highlights
    if (!Array.isArray(highlights)) continue
    for (const h of highlights) {
      if (!isHighlightKey(h)) continue
      counts.set(h, (counts.get(h) ?? 0) + 1)
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([k]) => HIGHLIGHT_LABELS_JA[k as keyof typeof HIGHLIGHT_LABELS_JA])
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { review_id } = await request.json().catch(() => ({}))
  if (typeof review_id !== 'string' || !review_id) {
    return NextResponse.json({ error: 'review_id は必須です' }, { status: 400 })
  }

  const { data: review } = await supabase
    .from('google_reviews')
    .select('id, facility_id, reviewer_name, star_rating, comment, facilities(name, address, amenities_note, checkin_instructions)')
    .eq('id', review_id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!review) return NextResponse.json({ error: 'クチコミが見つかりません' }, { status: 404 })

  const { data: profile } = await supabase
    .from('profiles').select('anthropic_api_key, company_name').eq('id', user.id).maybeSingle()
  const apiKey = (profile as { anthropic_api_key?: string | null } | null)?.anthropic_api_key?.trim()
    || process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({
      error: 'AIの利用にはAPIキーが必要です。アンケート結果ページの「AIクチコミ下書き」でAPIキーを設定してください。',
    }, { status: 400 })
  }

  const facility = review.facilities as unknown as {
    name: string; address: string | null; amenities_note: string | null; checkin_instructions: string | null
  } | null
  const strengths = await facilityStrengths(supabase, review.facility_id as string)
  const rating = Number(review.star_rating) || 0

  const prompt = [
    'あなたは宿泊施設の運営者として、Googleのクチコミに返信します。',
    '条件：',
    '- 日本語。丁寧だが硬すぎない、宿のオーナーらしい言葉づかい',
    '- 150〜250文字程度。改行は1〜2回まで。絵文字や箇条書きは使わない',
    '- まずお礼（低評価の場合はお詫び）を述べる',
    '- **投稿者が書いている良かった点に具体的に触れる**（書かれていない点は創作しない）',
    '- 施設の設備・サービスのうち、その投稿内容に関係するものを自然に1〜2つ盛り込む',
    '- 最後に再訪を歓迎する一文を添える',
    '- 返信本文だけを出力し、前置きや説明は書かない',
    '',
    `施設名：${facility?.name ?? ''}`,
    facility?.address ? `所在地：${facility.address}` : '',
    facility?.amenities_note ? `施設の設備・サービス：${facility.amenities_note}` : '',
    strengths.length ? `アンケートでよく挙がる魅力：${strengths.join('、')}` : '',
    '',
    `評価：★${rating || '不明'}（方針：${STAR_NOTE[rating] ?? 'お礼を述べ、改善姿勢を示す'}）`,
    `投稿者：${review.reviewer_name ?? '匿名'}`,
    `クチコミ本文：${review.comment?.trim() || '（本文なし。星評価のみ）'}`,
  ].filter(Boolean).join('\n')

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001',
        max_tokens: 800,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(25_000),
    })
    if (!res.ok) {
      const detail = (await res.text()).slice(0, 200)
      console.error('[reviews/suggest] Anthropic error:', res.status, detail)
      return NextResponse.json({
        error: res.status === 401
          ? 'APIキーが認証されませんでした。設定をご確認ください。'
          : `返信案の作成に失敗しました（${res.status}）`,
      }, { status: 502 })
    }
    const json = await res.json()
    const text = (json.content ?? [])
      .filter((c: { type?: string }) => c.type === 'text')
      .map((c: { text?: string }) => c.text ?? '')
      .join('').trim()
    if (!text) return NextResponse.json({ error: '返信案を作成できませんでした' }, { status: 502 })
    return NextResponse.json({ text, usedStrengths: strengths })
  } catch (e) {
    console.error('[reviews/suggest] error:', e)
    return NextResponse.json({ error: '返信案の作成に失敗しました。時間をおいて再度お試しください。' }, { status: 502 })
  }
}
