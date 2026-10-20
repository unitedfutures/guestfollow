import type { SupabaseClient } from '@supabase/supabase-js'
import type { GoogleCredentials } from '@/lib/google/business'

export type GoogleSettings = {
  clientId: string | null
  clientSecret: string | null
  refreshToken: string | null
  connectedEmail: string | null
}

/** 事業者のGoogle連携設定を読む（サーバー側のみ） */
export async function loadGoogleSettings(
  supabase: SupabaseClient, userId: string
): Promise<GoogleSettings> {
  const { data } = await supabase
    .from('profiles')
    .select('google_client_id, google_client_secret, google_refresh_token, google_connected_email')
    .eq('id', userId)
    .maybeSingle()
  const row = (data ?? {}) as Record<string, string | null>
  return {
    clientId: row.google_client_id ?? null,
    clientSecret: row.google_client_secret ?? null,
    refreshToken: row.google_refresh_token ?? null,
    connectedEmail: row.google_connected_email ?? null,
  }
}

/** APIを呼べる状態（OAuth設定＋連携済み）なら認証情報を返す */
export function toCredentials(s: GoogleSettings): GoogleCredentials | null {
  if (!s.clientId || !s.clientSecret || !s.refreshToken) return null
  return { clientId: s.clientId, clientSecret: s.clientSecret, refreshToken: s.refreshToken }
}

/** OAuthのリダイレクト先（Google Cloud側にも同じURLを登録してもらう） */
export function googleRedirectUri(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return `${base.replace(/\/$/, '')}/api/google/oauth/callback`
}
