import type { SupabaseClient } from '@supabase/supabase-js'
import { beds24RefreshAccessToken } from '@/lib/beds24/client'

type FacilityLike = { ota_account_id?: string | null }

type Beds24AccountRow = {
  id: string
  api_key: string | null
  refresh_token: string | null
  access_token: string | null
  access_token_expires_at: string | null
}

/**
 * Beds24 アカウントの refresh_token から、有効なアクセストークンを取得する。
 * - キャッシュ済み access_token が有効（失効60秒前まで）ならそれを返す
 * - 失効していれば refresh_token で再発行し、DBにキャッシュして返す
 * refresh_token が無ければ null。
 */
async function getBeds24AccessTokenFromAccount(
  supabase: SupabaseClient,
  account: Beds24AccountRow
): Promise<string | null> {
  if (!account.refresh_token) return null

  const now = Date.now()
  const exp = account.access_token_expires_at ? new Date(account.access_token_expires_at).getTime() : 0
  // 60秒のバッファを持たせて有効性を判定
  if (account.access_token && exp > now + 60_000) {
    return account.access_token
  }

  const { token, expiresIn } = await beds24RefreshAccessToken(account.refresh_token)
  const expiresAt = new Date(now + expiresIn * 1000).toISOString()
  await supabase
    .from('ota_accounts')
    .update({ access_token: token, access_token_expires_at: expiresAt })
    .eq('id', account.id)
  return token
}

/**
 * Beds24 でメッセージ送受信など「書き込み」に使うトークンを取得する。
 * refresh_token（invite code由来）があればそのアクセストークンを優先。
 * 無ければ api_key（Long Life Token）にフォールバックする。
 * 戻り値の source で、どちらのトークンかを呼び出し側が判別できる。
 */
export async function resolveBeds24Token(
  supabase: SupabaseClient,
  userId: string,
  facility: FacilityLike
): Promise<{ token: string | null; source: 'refresh' | 'longlife' | null }> {
  if (facility.ota_account_id) {
    const { data: account } = await supabase
      .from('ota_accounts')
      .select('id, api_key, refresh_token, access_token, access_token_expires_at')
      .eq('id', facility.ota_account_id)
      .single()
    if (account) {
      const access = await getBeds24AccessTokenFromAccount(supabase, account as Beds24AccountRow)
      if (access) return { token: access, source: 'refresh' }
      if (account.api_key) return { token: account.api_key, source: 'longlife' }
    }
  }

  // レガシー: profiles.beds24_api_key（Long Life Token）
  const { data: profile } = await supabase
    .from('profiles')
    .select('beds24_api_key')
    .eq('id', userId)
    .single()
  const key = (profile as { beds24_api_key?: string | null } | null)?.beds24_api_key ?? null
  return { token: key, source: key ? 'longlife' : null }
}

/**
 * 施設に紐づくサイトコントローラーのAPIキーを取得する。
 * ota_account_id 優先、なければ profiles のレガシーキーにフォールバック。
 */
export async function resolveApiKey(
  supabase: SupabaseClient,
  userId: string,
  facility: FacilityLike,
  provider: 'beds24' | 'airhost'
): Promise<string | null> {
  if (facility.ota_account_id) {
    const { data: account } = await supabase
      .from('ota_accounts')
      .select('api_key, provider')
      .eq('id', facility.ota_account_id)
      .single()
    if (account?.provider === provider && account.api_key) return account.api_key
    if (account?.api_key) return account.api_key
  }

  const col = provider === 'beds24' ? 'beds24_api_key' : 'airhost_api_key'
  const { data: profile } = await supabase
    .from('profiles')
    .select(col)
    .eq('id', userId)
    .single()

  return (profile as Record<string, string | null> | null)?.[col] ?? null
}
