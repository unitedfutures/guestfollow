// ============================================================
// Googleビジネスプロフィール連携
//   OAuth（refresh token）でアクセストークンを得て、クチコミの取得・返信を行う。
//   API: https://developers.google.com/my-business
//   ※ 利用にはGoogleへのAPI利用申請（承認）が必要。
// ============================================================

export const GOOGLE_SCOPE = 'https://www.googleapis.com/auth/business.manage'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const ACCOUNTS_URL = 'https://mybusinessaccountmanagement.googleapis.com/v1'
const INFO_URL = 'https://mybusinessbusinessinformation.googleapis.com/v1'
const REVIEWS_URL = 'https://mybusiness.googleapis.com/v4'

export type GoogleCredentials = {
  clientId: string
  clientSecret: string
  refreshToken: string
}

/** Googleのエラー本文から、画面に出せる文言を作る */
async function googleError(res: Response, fallback: string): Promise<Error> {
  const text = await res.text()
  let message = text.slice(0, 300)
  try {
    const json = JSON.parse(text)
    message = json?.error?.message ?? json?.error_description ?? message
  } catch { /* そのまま使う */ }
  if (res.status === 401 || res.status === 403) {
    return new Error(`${message}（Googleの権限が不足しています。API利用申請の承認状況と、連携したアカウントの権限をご確認ください）`)
  }
  return new Error(`${fallback}: ${message}`)
}

/** 認可画面のURL。offline + consent で refresh token を確実に受け取る */
export function buildAuthUrl(clientId: string, redirectUri: string, state: string): string {
  const qs = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: GOOGLE_SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state,
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${qs}`
}

/** 認可コードを refresh token に交換する */
export async function exchangeCode(
  clientId: string, clientSecret: string, code: string, redirectUri: string
): Promise<{ refreshToken: string; accessToken: string }> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId, client_secret: clientSecret,
      code, redirect_uri: redirectUri, grant_type: 'authorization_code',
    }),
  })
  if (!res.ok) throw await googleError(res, 'Googleとの連携に失敗しました')
  const json = await res.json()
  if (!json.refresh_token) {
    throw new Error('リフレッシュトークンを取得できませんでした。Googleアカウントの連携を一度解除してから、もう一度お試しください。')
  }
  return { refreshToken: String(json.refresh_token), accessToken: String(json.access_token ?? '') }
}

/** refresh token からアクセストークンを得る（都度発行。保存はしない） */
export async function getAccessToken(cred: GoogleCredentials): Promise<string> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: cred.clientId, client_secret: cred.clientSecret,
      refresh_token: cred.refreshToken, grant_type: 'refresh_token',
    }),
  })
  if (!res.ok) throw await googleError(res, 'アクセストークンの取得に失敗しました')
  const json = await res.json()
  return String(json.access_token ?? '')
}

async function googleFetch(url: string, accessToken: string, init?: RequestInit) {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })
  if (!res.ok) throw await googleError(res, 'Googleとの通信に失敗しました')
  return res.json()
}

/** 連携したGoogleアカウントのメールアドレス（表示用） */
export async function getConnectedEmail(accessToken: string): Promise<string> {
  try {
    const json = await googleFetch('https://www.googleapis.com/oauth2/v2/userinfo', accessToken)
    return String(json.email ?? '')
  } catch {
    return ''
  }
}

export type GoogleLocation = {
  name: string        // accounts/123/locations/456
  title: string       // ビジネス名
  address: string
}

/** 連携アカウントが管理しているロケーション（店舗・施設）の一覧 */
export async function listLocations(accessToken: string): Promise<GoogleLocation[]> {
  const accounts = await googleFetch(`${ACCOUNTS_URL}/accounts?pageSize=20`, accessToken)
  const list: GoogleLocation[] = []

  for (const account of accounts.accounts ?? []) {
    const accountName = String(account.name ?? '')  // accounts/123
    if (!accountName) continue
    let pageToken: string | undefined
    do {
      const qs = new URLSearchParams({
        readMask: 'name,title,storefrontAddress',
        pageSize: '100',
        ...(pageToken ? { pageToken } : {}),
      })
      const page = await googleFetch(`${INFO_URL}/${accountName}/locations?${qs}`, accessToken)
      for (const loc of page.locations ?? []) {
        const addr = loc.storefrontAddress
        list.push({
          // v4のレビューAPIは accounts/*/locations/* 形式を使う
          name: `${accountName}/${String(loc.name ?? '').replace(/^locations\//, '')}`,
          title: String(loc.title ?? ''),
          address: [addr?.postalCode, ...(addr?.addressLines ?? []), addr?.locality, addr?.administrativeArea]
            .filter(Boolean).join(' '),
        })
      }
      pageToken = page.nextPageToken
    } while (pageToken)
  }
  return list
}

export type GoogleReview = {
  name: string              // accounts/*/locations/*/reviews/*
  reviewerName: string
  reviewerPhotoUrl: string
  starRating: number        // 1〜5
  comment: string
  createTime: string | null
  updateTime: string | null
  replyComment: string | null
  replyUpdateTime: string | null
}

const STAR_TO_NUMBER: Record<string, number> = {
  ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5,
}

/** 指定ロケーションのクチコミを全件取得する（1ページ最大50件） */
export async function listReviews(accessToken: string, locationName: string): Promise<GoogleReview[]> {
  const reviews: GoogleReview[] = []
  let pageToken: string | undefined
  let guard = 0
  do {
    const qs = new URLSearchParams({ pageSize: '50', ...(pageToken ? { pageToken } : {}) })
    const page = await googleFetch(`${REVIEWS_URL}/${locationName}/reviews?${qs}`, accessToken)
    for (const r of page.reviews ?? []) {
      reviews.push({
        name: String(r.name ?? ''),
        reviewerName: String(r.reviewer?.displayName ?? ''),
        reviewerPhotoUrl: String(r.reviewer?.profilePhotoUrl ?? ''),
        starRating: STAR_TO_NUMBER[String(r.starRating ?? '')] ?? 0,
        comment: String(r.comment ?? ''),
        createTime: r.createTime ?? null,
        updateTime: r.updateTime ?? null,
        replyComment: r.reviewReply?.comment ?? null,
        replyUpdateTime: r.reviewReply?.updateTime ?? null,
      })
    }
    pageToken = page.nextPageToken
  } while (pageToken && ++guard < 40)
  return reviews
}

/** クチコミに返信する（既存の返信がある場合は上書き） */
export async function replyToReview(
  accessToken: string, reviewName: string, comment: string
): Promise<{ updateTime: string | null }> {
  const json = await googleFetch(`${REVIEWS_URL}/${reviewName}/reply`, accessToken, {
    method: 'PUT',
    body: JSON.stringify({ comment }),
  })
  return { updateTime: json.updateTime ?? null }
}
