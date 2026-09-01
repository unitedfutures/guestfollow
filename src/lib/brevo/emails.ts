import { formatDate } from '@/lib/utils'

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email'

const apiKey = process.env.BREVO_API_KEY ?? ''
const fromEmail = process.env.BREVO_FROM_EMAIL || 'noreply@checkinn.jp'
const fromName = process.env.BREVO_FROM_NAME || 'GuestFollow'

async function sendEmail(payload: {
  to: { email: string; name?: string }[]
  subject: string
  htmlContent: string
}) {
  if (!apiKey) {
    console.warn('[Brevo] BREVO_API_KEY が設定されていません。メール送信をスキップします。')
    return
  }

  const res = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: fromName, email: fromEmail },
      ...payload,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    console.error(`[Brevo] メール送信エラー ${res.status}:`, text)
    throw new Error(`Brevo API error ${res.status}: ${text}`)
  }

  return res.json()
}

// ─── 事前登録フォームURLを送付 ───────────────────────────────────────

interface PreCheckinEmailParams {
  to: string
  guestName: string
  token: string
  propertyName: string
  checkinDate: string
  checkoutDate: string
  appUrl: string
}

export async function sendPreCheckinEmail(params: PreCheckinEmailParams) {
  const { to, guestName, token, propertyName, checkinDate, checkoutDate, appUrl } = params
  const formUrl = `${appUrl}/pre-checkin/${token}`

  return sendEmail({
    to: [{ email: to, name: guestName || undefined }],
    subject: `【GuestFollow】${propertyName} ご宿泊前のお手続きをお願いします`,
    htmlContent: `
      <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#1f2937;">
        <h1 style="color:#1C3461;font-size:22px;letter-spacing:0.1em;margin-bottom:4px;">GuestFollow</h1>
        <p style="color:#9ca3af;font-size:13px;margin-bottom:32px;">セルフチェックインシステム</p>

        <p>${guestName ? `${guestName} 様` : 'ご予約のお客様'}</p>
        <p>このたびは <strong>${propertyName}</strong> へのご予約ありがとうございます。</p>
        <p>スムーズなチェックインのため、<strong>チェックイン前日まで</strong>に以下のリンクから事前登録をお願いします。</p>

        <div style="background:#f3f4f6;border-radius:12px;padding:20px;margin:24px 0;">
          <p style="margin:0;font-size:13px;color:#6b7280;">宿泊期間</p>
          <p style="margin:4px 0 0;font-size:16px;font-weight:700;color:#111827;">
            ${formatDate(checkinDate)} 〜 ${formatDate(checkoutDate)}
          </p>
        </div>

        <a href="${formUrl}"
           style="display:inline-block;background:#1C3461;color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;font-size:15px;margin-bottom:24px;">
          事前登録を行う →
        </a>

        <p style="font-size:12px;color:#9ca3af;line-height:1.8;">
          ※ このリンクはご予約のお客様専用です。第三者への共有はご遠慮ください。<br>
          ※ 登録完了後、チェックイン案内をお送りします。<br>
          ※ ご不明な点はお気軽にお問い合わせください。
        </p>
      </div>
    `,
  })
}

// ─── チェックイン案内リンクを送付 ────────────────────────────────────

interface CheckinQrEmailParams {
  to: string
  guestName: string
  guestQrToken: string
  propertyName: string
  checkinDate: string
  emergencyContact: string | null
  appUrl: string
}

export async function sendCheckinQrEmail(params: CheckinQrEmailParams) {
  const { to, guestName, guestQrToken, propertyName, checkinDate, emergencyContact, appUrl } = params
  const checkinUrl = `${appUrl}/checkin-verify/${guestQrToken}`

  return sendEmail({
    to: [{ email: to, name: guestName || undefined }],
    subject: `【GuestFollow】${propertyName} チェックイン案内`,
    htmlContent: `
      <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#1f2937;">
        <h1 style="color:#1C3461;font-size:22px;letter-spacing:0.1em;margin-bottom:4px;">GuestFollow</h1>
        <p style="color:#9ca3af;font-size:13px;margin-bottom:32px;">セルフチェックインシステム</p>

        <p>${guestName} 様</p>
        <p>事前登録が完了しました。<strong>${formatDate(checkinDate)}</strong> のチェックイン当日は、以下の手順でお部屋に入室してください。</p>

        <div style="background:#eef2ff;border-left:4px solid #1C3461;padding:16px 20px;border-radius:0 8px 8px 0;margin:24px 0;">
          <p style="margin:0;font-weight:700;color:#1C3461;">チェックイン手順</p>
          <ol style="margin:8px 0 0;padding-left:20px;color:#374151;font-size:14px;line-height:2.2;">
            <li>施設玄関のQRコードをスマホカメラでスキャン</li>
            <li>「認証する」をタップしてFace ID / 指紋で認証</li>
            <li>暗証番号が表示されたら入力して入室</li>
          </ol>
        </div>

        <p style="font-size:13px;color:#6b7280;margin-bottom:8px;">
          ▼ 当日使用するチェックインリンク（ブックマーク推奨）
        </p>
        <a href="${checkinUrl}"
           style="display:inline-block;background:#059669;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:700;font-size:14px;margin-bottom:24px;">
          チェックインページを開く
        </a>

        ${emergencyContact ? `
        <div style="background:#fef9c3;border-radius:8px;padding:14px 18px;font-size:13px;color:#713f12;margin-bottom:16px;">
          <strong>緊急連絡先：</strong>${emergencyContact}
        </div>
        ` : ''}

        <p style="font-size:12px;color:#9ca3af;line-height:1.8;">
          ※ このリンクはご本人様専用・1回限りです。スクリーンショットに保存しておくと便利です。<br>
          ※ 有効期間はご宿泊日当日のみです。
        </p>
      </div>
    `,
  })
}
