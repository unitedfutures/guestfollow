import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { HIGHLIGHT_LABELS_JA, isHighlightKey } from '@/lib/survey/highlights'

// 公開エンドポイント（認証不要）。アンケートの回答からクチコミ下書きを作る。
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const RATING_LABELS: Record<string, string> = {
  overall: '総合評価', cleanliness: '清潔さ', facilities: '設備・アメニティ', location: '立地・アクセス',
}

type Answers = Record<string, unknown>

/** 回答を日本語の箇条書きにまとめる（AIへの入力・定型文の材料） */
function summarize(answers: Answers, facilityName: string) {
  const ratings = Object.entries(RATING_LABELS)
    .filter(([k]) => typeof answers[k] === 'number')
    .map(([k, label]) => `${label}：★${answers[k]}`)
  const highlights = Array.isArray(answers.highlights)
    ? answers.highlights.filter(isHighlightKey).map(k => HIGHLIGHT_LABELS_JA[k])
    : []
  const comment = typeof answers.comment === 'string' ? answers.comment.trim() : ''
  const revisit = answers.revisit === 'yes' ? 'また利用したい' : ''
  return { facilityName, ratings, highlights, comment, revisit }
}

/** AIを使わない下書き（APIキー未設定時・生成失敗時のフォールバック） */
function templateDraft(s: ReturnType<typeof summarize>): string {
  const parts: string[] = []
  parts.push(`${s.facilityName}に宿泊しました。`)
  if (s.highlights.length > 0) {
    parts.push(`${s.highlights.slice(0, 3).join('・')}がとても良かったです。`)
  }
  if (s.comment) parts.push(s.comment)
  if (s.revisit) parts.push('機会があればまた利用したいと思います。')
  return parts.join('')
}

/** Claude で自然なクチコミ文を作る。失敗時は null を返して定型文に任せる */
async function aiDraft(s: ReturnType<typeof summarize>, lang: string, apiKey: string | null): Promise<string | null> {
  if (!apiKey) return null

  const prompt = [
    'あなたは宿泊した本人として、Googleマップに投稿するクチコミの下書きを書きます。',
    '条件：',
    '- 宿泊者本人の一人称で、自然な話し言葉。誇張や宣伝文句は避ける',
    '- 120〜200文字程度。見出しや箇条書き、絵文字は使わない',
    '- 下の「評価」と「良かった点」「自由コメント」に書かれていない事実を創作しない',
    '- 施設名は本文に入れてよい',
    `- 出力は ${lang === 'ja' ? '日本語' : `言語コード ${lang} の言語`} のみ。前置きや説明は書かず、クチコミ本文だけを返す`,
    '',
    `施設名：${s.facilityName}`,
    s.ratings.length ? `評価：${s.ratings.join('、')}` : '',
    s.highlights.length ? `良かった点：${s.highlights.join('、')}` : '',
    s.comment ? `自由コメント：${s.comment}` : '',
    s.revisit ? '再訪意向：あり' : '',
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
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(20_000),
    })
    if (!res.ok) {
      console.error('[review-draft] Anthropic API error:', res.status, (await res.text()).slice(0, 200))
      return null
    }
    const json = await res.json()
    const text = (json.content ?? [])
      .filter((c: { type?: string }) => c.type === 'text')
      .map((c: { text?: string }) => c.text ?? '')
      .join('')
      .trim()
    return text || null
  } catch (e) {
    console.error('[review-draft] generation failed:', e)
    return null
  }
}

export async function POST(request: Request) {
  try {
    const { qr_slug, answers, lang } = await request.json()
    if (!qr_slug) return NextResponse.json({ error: 'qr_slug is required' }, { status: 400 })
    if (answers != null && (typeof answers !== 'object' || Array.isArray(answers))) {
      return NextResponse.json({ error: 'answers が不正です' }, { status: 400 })
    }
    if (answers && JSON.stringify(answers).length > 10_000) {
      return NextResponse.json({ error: '回答が長すぎます' }, { status: 400 })
    }

    const { data: facility } = await supabase
      .from('facilities').select('name, user_id').eq('qr_slug', qr_slug).single()
    if (!facility) return NextResponse.json({ error: '施設が見つかりません' }, { status: 404 })

    // APIキーは施設オーナーの設定を優先し、無ければ環境変数（キーはサーバー外へ出さない）
    const { data: profile } = await supabase
      .from('profiles').select('anthropic_api_key').eq('id', facility.user_id).maybeSingle()
    const apiKey = (profile as { anthropic_api_key?: string | null } | null)?.anthropic_api_key?.trim()
      || process.env.ANTHROPIC_API_KEY
      || null

    const summary = summarize((answers ?? {}) as Answers, facility.name)
    const language = typeof lang === 'string' && /^[a-zA-Z-]{2,10}$/.test(lang) ? lang : 'ja'

    const ai = await aiDraft(summary, language, apiKey)
    return NextResponse.json({ text: ai ?? templateDraft(summary), generated: ai !== null })
  } catch (e) {
    console.error('[/api/survey/review-draft] error:', e)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}
