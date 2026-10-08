import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { isMissingColumn } from '@/lib/beds24/sync-write'

// クチコミ下書き生成（AI）のAPIキーを設定・解除する。
// キーは保存後に画面へ返さない（設定済みかどうかだけを返す）。

const MISSING_COLUMN_MESSAGE =
  'APIキーを保存する列がまだありません。Supabaseで supabase/add-anthropic-api-key.sql を実行してください。'

/** 入力されたキーが実際に使えるか、最小のリクエストで確かめる */
async function verifyKey(apiKey: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'ping' }],
      }),
      signal: AbortSignal.timeout(15_000),
    })
    if (res.ok) return { ok: true }
    if (res.status === 401) return { ok: false, error: 'APIキーが認証されませんでした。値をご確認ください。' }
    if (res.status === 400) {
      // max_tokens:1 でも応答は返る。400はモデル名などの問題でキー自体は有効な可能性がある
      return { ok: true }
    }
    if (res.status === 429) return { ok: false, error: 'Anthropic側で利用制限中です。時間をおいて再度お試しください。' }
    return { ok: false, error: `Anthropicからエラーが返りました（${res.status}）。` }
  } catch {
    return { ok: false, error: 'Anthropicに接続できませんでした。時間をおいて再度お試しください。' }
  }
}

export async function PUT(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { api_key } = await request.json().catch(() => ({}))
  const key = typeof api_key === 'string' ? api_key.trim() : ''
  if (!key) return NextResponse.json({ error: 'APIキーを入力してください' }, { status: 400 })
  if (!key.startsWith('sk-ant-') || key.length < 40 || key.length > 300) {
    return NextResponse.json({ error: 'APIキーの形式が正しくありません（sk-ant- で始まる値を貼り付けてください）' }, { status: 400 })
  }

  const check = await verifyKey(key)
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 })

  const { error } = await supabase
    .from('profiles')
    .update({ anthropic_api_key: key, updated_at: new Date().toISOString() })
    .eq('id', user.id)
  if (error) {
    if (isMissingColumn(error, 'anthropic_api_key')) {
      return NextResponse.json({ error: MISSING_COLUMN_MESSAGE }, { status: 400 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true, configured: true })
}

export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('profiles')
    .update({ anthropic_api_key: null, updated_at: new Date().toISOString() })
    .eq('id', user.id)
  if (error) {
    if (isMissingColumn(error, 'anthropic_api_key')) {
      return NextResponse.json({ error: MISSING_COLUMN_MESSAGE }, { status: 400 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true, configured: false })
}
