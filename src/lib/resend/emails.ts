import { Resend } from 'resend'
import { formatDate } from '@/lib/utils'

const resend = new Resend(process.env.RESEND_API_KEY)
const from = process.env.RESEND_FROM_EMAIL || 'noreply@checkinn.jp'

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

  return resend.emails.send({
    from,
    to,
    subject: `【GuestFollow】${propertyName} ご宿泊前のお手続きをお願いします`,
    html: `
      <div style="font-family:'Helvetica Neue',sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#1f2937;">
        <h1 style="color:#4f46e5;font-size:22px;letter-spacing:0.1em;margin-bottom:4px;">GuestFollow</h1>
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
           style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;font-size:15px;margin-bottom:24px;">
          事前登録を行う →
        </a>

        <p style="font-size:12px;color:#9ca3af;line-height:1.8;">
          ※ このリンクはご予約のお客様専用です。第三者への共有はご遠慮ください。<br>
          ※ 登録完了後、現地チェックイン用QRコードをお送りします。<br>
          ※ ご不明な点はお気軽にお問い合わせください。
        </p>
      </div>
    `,
  })
}

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
  const qrUrl = `${appUrl}/checkin-verify/${guestQrToken}`

  return resend.emails.send({
    from,
    to,
    subject: `【GuestFollow】${propertyName} チェックイン用QRコードをお送りします`,
    html: `
      <div style="font-family:'Helvetica Neue',sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#1f2937;">
        <h1 style="color:#4f46e5;font-size:22px;letter-spacing:0.1em;margin-bottom:4px;">GuestFollow</h1>
        <p style="color:#9ca3af;font-size:13px;margin-bottom:32px;">セルフチェックインシステム</p>

        <p>${guestName} 様</p>
        <p>事前登録が完了しました。<strong>${formatDate(checkinDate)}</strong> のチェックイン当日は、以下の手順でお部屋に入室してください。</p>

        <div style="background:#eef2ff;border-left:4px solid #4f46e5;padding:16px 20px;border-radius:0 8px 8px 0;margin:24px 0;">
          <p style="margin:0;font-weight:700;color:#3730a3;">チェックイン手順</p>
          <ol style="margin:8px 0 0;padding-left:20px;color:#374151;font-size:14px;line-height:2;">
            <li>施設玄関前に設置のQRコードをスキャン</li>
            <li>画面の指示に従い顔写真を撮影</li>
            <li>本メールのQRコードをかざして照合</li>
            <li>暗証番号が表示されます</li>
          </ol>
        </div>

        <p style="font-size:13px;color:#6b7280;">▼ チェックイン用QRコード（このURLを施設で使用します）</p>
        <a href="${qrUrl}"
           style="display:inline-block;background:#059669;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:700;font-size:14px;margin-bottom:24px;word-break:break-all;">
          チェックイン用リンクを開く
        </a>

        ${emergencyContact ? `
        <div style="background:#fef9c3;border-radius:8px;padding:14px 18px;font-size:13px;color:#713f12;">
          <strong>緊急連絡先：</strong>${emergencyContact}
        </div>
        ` : ''}

        <p style="font-size:12px;color:#9ca3af;margin-top:24px;line-height:1.8;">
          ※ このQRコードはご本人様専用です。スクリーンショットを保存してご利用ください。
        </p>
      </div>
    `,
  })
}
