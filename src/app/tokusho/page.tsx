import Link from 'next/link'
import { Logo } from '@/components/logo'

export const metadata = {
  title: '特定商取引法に基づく表記 | GuestFollow',
}

const rows = [
  { label: '販売事業者', value: '株式会社ユナイテッドフューチャーズ' },
  { label: '代表者', value: '小林 稔幸' },
  {
    label: '所在地',
    value: '東京都小金井市貫井南町3-22-27-703\n※請求があった場合は遅滞なく開示いたします。',
  },
  {
    label: '連絡先',
    value: 'メールアドレス：support@united-futures.com\n※電話でのお問い合わせは受け付けておりません。メールにてご連絡ください。',
  },
  { label: 'サービス名', value: 'GuestFollow（チェックイン）' },
  {
    label: 'サービス内容',
    value: '無人宿泊施設向けセルフチェックインシステム。宿泊者情報の事前登録・パスキー認証によるチェックイン・宿泊者名簿の自動生成・Beds24連携等の機能を提供するSaaSサービス。',
  },
  { label: 'サービスURL', value: 'https://guestfollow.jp' },
  {
    label: '料金',
    value: '現在ベータ版として無料でご提供しています。\n今後、有料プランを導入する場合は事前にご案内いたします。',
  },
  {
    label: '支払方法',
    value: 'クレジットカード決済（準備中）\n※有料プラン導入時にお知らせいたします。',
  },
  {
    label: '支払時期',
    value: '有料プラン導入時に定める月次または年次の決済サイクルに従います。',
  },
  {
    label: 'サービス提供時期',
    value: 'アカウント登録完了後、直ちにご利用いただけます。',
  },
  {
    label: '解約・キャンセル',
    value: 'ダッシュボードの設定画面からいつでも解約できます。解約月の日割り返金には対応しておりません。\n※現在無料期間中のため、解約に伴う費用は発生しません。',
  },
  {
    label: '返金条件',
    value: 'サービスの性質上、原則として返金はお受けしておりません。ただし当社の責に帰すべき事由によりサービスが提供できない場合はこの限りではありません。',
  },
  {
    label: '動作環境',
    value: 'ブラウザ：Chrome・Safari・Firefox・Edge の最新版\nモバイル：iOS 16以降、Android 10以降\n※パスキー（Face ID・Touch ID）機能の利用にはWebAuthn対応デバイスが必要です。',
  },
  {
    label: '特記事項',
    value: 'GuestFollowは宿泊施設の事業者（管理者）向けのツールです。ゲスト（宿泊者）の個人情報は各施設の宿泊者名簿作成・旅館業法遵守を目的として収集・保存されます。詳細はプライバシーポリシーをご確認ください。',
  },
]

export default function TokushoPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* ヘッダー */}
      <header className="bg-navy-700 py-4 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/">
            <Logo variant="default" size="sm" />
          </Link>
          <Link href="/" className="text-navy-200 hover:text-white text-sm transition-colors">
            ← トップへ戻る
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">特定商取引法に基づく表記</h1>
        <p className="text-sm text-gray-400 mb-10">最終更新日：2026年5月20日</p>

        <div className="border border-gray-200 rounded-2xl overflow-hidden">
          {rows.map(({ label, value }, i) => (
            <div
              key={label}
              className={`grid grid-cols-1 sm:grid-cols-[200px_1fr] ${i !== rows.length - 1 ? 'border-b border-gray-100' : ''}`}
            >
              <div className="bg-navy-50 px-5 py-4 sm:py-5">
                <p className="text-sm font-semibold text-navy-700">{label}</p>
              </div>
              <div className="px-5 py-4 sm:py-5">
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{value}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-gray-400 mt-8 leading-relaxed">
          本表記は特定商取引に関する法律第11条の規定に基づき表示しています。内容は予告なく変更される場合があります。
          変更後は本ページに掲載した時点で効力を生じるものとします。
        </p>
      </main>

      <footer className="border-t border-gray-100 py-8 px-6 text-center">
        <p className="text-xs text-gray-400">
          <a href="https://united-futures.com/" target="_blank" rel="noopener noreferrer" className="hover:text-gray-600 transition-colors">© 2026 UNITED FUTURES, INC.</a>
        </p>
        <div className="flex justify-center gap-6 mt-3 text-xs text-gray-400">
          <Link href="/tokusho" className="hover:text-navy-500 transition-colors">特定商取引法に基づく表記</Link>
          <Link href="/privacy" className="hover:text-navy-500 transition-colors">プライバシーポリシー</Link>
        </div>
      </footer>
    </div>
  )
}
