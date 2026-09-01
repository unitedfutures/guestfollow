import Link from 'next/link'
import { Logo } from '@/components/logo'

export const metadata = {
  title: 'プライバシーポリシー | GuestFollow',
}

export default function PrivacyPage() {
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
        <h1 className="text-2xl font-bold text-gray-900 mb-2">プライバシーポリシー</h1>
        <p className="text-sm text-gray-400 mb-10">最終更新日：2026年5月20日　施行日：2026年5月20日</p>

        <div className="prose prose-sm max-w-none text-gray-700 space-y-10">

          <section>
            <p className="leading-relaxed">
              株式会社ユナイテッドフューチャーズ（以下「当社」）は、GuestFollow（以下「本サービス」）を運営するにあたり、
              利用者（宿泊施設の事業者および宿泊者）の個人情報を適切に取り扱うことを重要な責務と考えています。
              本プライバシーポリシー（以下「本ポリシー」）では、当社が収集する情報の種類・目的・取り扱い方法について説明します。
            </p>
          </section>

          <Section title="第1条（事業者情報）">
            <Table rows={[
              ['会社名', '株式会社ユナイテッドフューチャーズ（United Futures Inc.）'],
              ['代表者', '小林 稔幸'],
              ['所在地', '東京都小金井市貫井南町3-22-27-703'],
              ['お問い合わせ', 'support@united-futures.com'],
            ]} />
          </Section>

          <Section title="第2条（収集する情報）">
            <p className="mb-4">本サービスでは、以下の情報を収集します。</p>

            <SubSection title="2-1. 事業者（管理者）から収集する情報">
              <ul>
                <li>メールアドレス（アカウント登録・認証用）</li>
                <li>会社名・施設名（管理ダッシュボード表示用）</li>
                <li>Beds24 APIキー（OTA連携機能の利用時のみ）</li>
                <li>利用ログ・アクセス履歴</li>
              </ul>
            </SubSection>

            <SubSection title="2-2. ゲスト（宿泊者）から収集する情報">
              <p className="mb-2">本サービスの事前登録フォームを通じて、以下の情報を収集します。</p>
              <ul>
                <li>氏名（代表者）</li>
                <li>メールアドレス</li>
                <li>電話番号</li>
                <li>住所</li>
                <li>宿泊人数</li>
                <li>顔写真（任意。施設側の設定による）</li>
                <li>国籍・旅券番号・旅券画像（外国人宿泊者のみ、旅館業法に基づく義務）</li>
                <li>規約同意の日時・IPアドレス</li>
                <li>パスキー認証情報（WebAuthnの公開鍵情報のみ。生体情報はデバイス外に送信されません）</li>
              </ul>
            </SubSection>
          </Section>

          <Section title="第3条（情報の利用目的）">
            <SubSection title="事業者の情報">
              <ul>
                <li>アカウントの作成・認証・管理</li>
                <li>本サービスの提供・改善</li>
                <li>お問い合わせへの対応</li>
                <li>料金請求（有料プラン導入時）</li>
                <li>サービスに関する重要なお知らせの送付</li>
              </ul>
            </SubSection>
            <SubSection title="ゲストの情報">
              <ul>
                <li>旅館業法第6条に基づく宿泊者名簿の作成・保存</li>
                <li>チェックイン時の本人確認（パスキー認証）</li>
                <li>施設への入室用暗証番号の発行</li>
                <li>法令に基づく行政機関への提供（保健所等の調査・検査時）</li>
              </ul>
            </SubSection>
          </Section>

          <Section title="第4条（個人情報の保存期間）">
            <p className="mb-3">
              ゲストの宿泊者情報は、旅館業法の規定に従い<strong>チェックアウト日から3年間</strong>保存します。
              保存期間経過後は速やかに削除します。
            </p>
            <p>
              事業者のアカウント情報は、アカウントの解約・削除から90日後に削除します。
            </p>
          </Section>

          <Section title="第5条（第三者への提供）">
            <p className="mb-3">当社は、以下の場合を除き、個人情報を第三者に提供しません。</p>
            <ul>
              <li>ご本人の同意がある場合</li>
              <li>旅館業法その他の法令に基づく保健所・警察等への提供</li>
              <li>人の生命・身体・財産の保護のために必要な場合</li>
              <li>公衆衛生の向上または児童の健全な育成のために必要な場合</li>
              <li>国・地方公共団体の法令業務に協力する場合</li>
            </ul>
          </Section>

          <Section title="第6条（委託先・利用サービス）">
            <p className="mb-4">当社は、サービス提供のために以下の第三者サービスを利用しています。各社のプライバシーポリシーをご確認ください。</p>
            <Table rows={[
              ['Supabase, Inc.', 'データベース・ストレージ・認証', 'https://supabase.com/privacy'],
              ['Brevo (Sendinblue)', 'メール配信', 'https://www.brevo.com/legal/privacypolicy/'],
              ['Vercel, Inc.', 'アプリケーションホスティング', 'https://vercel.com/legal/privacy-policy'],
              ['Beds24', '予約管理システム連携（利用施設のみ）', 'https://beds24.com/privacy'],
            ]} headers={['サービス', '利用目的', 'プライバシーポリシー']} />
          </Section>

          <Section title="第7条（パスキー・生体認証について）">
            <p className="mb-3">
              本サービスのチェックイン認証にはWebAuthn（パスキー）を使用します。
              Face ID・Touch ID・指紋認証などの<strong>生体情報は、ゲストのデバイス内でのみ処理され、当社のサーバーに送信・保存されることはありません。</strong>
            </p>
            <p>
              当社が保存するのは、WebAuthn仕様に基づく公開鍵情報のみです。この情報から生体情報を復元することはできません。
            </p>
          </Section>

          <Section title="第8条（Cookie・アクセス解析）">
            <p className="mb-3">
              本サービスでは、ログイン状態の維持のためにセッションCookieを使用します。
            </p>
            <p>
              現時点では第三者のトラッキングCookieやアクセス解析ツールは使用していません。
              将来的に導入する場合は本ポリシーを更新してお知らせします。
            </p>
          </Section>

          <Section title="第9条（個人情報の開示・訂正・削除）">
            <p className="mb-3">
              ご本人または宿泊施設の事業者から、保有する個人情報の開示・訂正・削除・利用停止のご請求があった場合、
              本人確認のうえ、合理的な期間内に対応します。
            </p>
            <p>
              お問い合わせは <strong>support@united-futures.com</strong> までご連絡ください。
            </p>
          </Section>

          <Section title="第10条（安全管理措置）">
            <ul>
              <li>データは暗号化して保存（Supabaseの暗号化ストレージを使用）</li>
              <li>通信はすべてHTTPS（TLS）で暗号化</li>
              <li>旅券画像・顔写真はプライベートストレージに保存し、署名付きURLでのみアクセス可能</li>
              <li>アクセス制御はRow Level Security（RLS）により各施設のデータを厳密に分離</li>
              <li>パスワードはSupabase Authによりハッシュ化して管理</li>
            </ul>
          </Section>

          <Section title="第11条（未成年者の個人情報）">
            <p>
              本サービスは宿泊施設の事業者向けサービスです。16歳未満の方の事業者アカウント登録は想定しておりません。
              宿泊者情報については旅館業法の規定に従い取り扱います。
            </p>
          </Section>

          <Section title="第12条（本ポリシーの変更）">
            <p>
              当社は、法令の改正・サービスの変更等に応じて本ポリシーを変更することがあります。
              重要な変更を行う場合は、サービス内または登録メールアドレスへの通知にて事前にお知らせします。
              変更後のポリシーは、本ページへの掲載をもって効力を生じます。
            </p>
          </Section>

          <Section title="第13条（お問い合わせ）">
            <p>個人情報の取り扱いに関するお問い合わせは、以下の窓口までご連絡ください。</p>
            <div className="mt-4 bg-navy-50 rounded-xl px-5 py-4 text-sm">
              <p className="font-semibold text-navy-700 mb-1">個人情報お問い合わせ窓口</p>
              <p>株式会社ユナイテッドフューチャーズ</p>
              <p>メールアドレス：support@united-futures.com</p>
              <p className="text-xs text-gray-400 mt-1">※電話でのお問い合わせは受け付けておりません。</p>
            </div>
          </Section>

        </div>
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-base font-bold text-navy-700 border-l-4 border-gold-400 pl-3 mb-4">{title}</h2>
      <div className="text-sm text-gray-700 leading-relaxed space-y-3 pl-1">{children}</div>
    </section>
  )
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <h3 className="text-sm font-semibold text-gray-800 mb-2">{title}</h3>
      <div className="pl-3">{children}</div>
    </div>
  )
}

function Table({ rows, headers }: { rows: string[][]; headers?: string[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 mt-2">
      <table className="w-full text-sm">
        {headers && (
          <thead>
            <tr className="bg-navy-50">
              {headers.map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-navy-700">{h}</th>
              ))}
            </tr>
          </thead>
        )}
        <tbody className="divide-y divide-gray-100">
          {rows.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              {row.map((cell, j) => (
                <td key={j} className={`px-4 py-3 text-gray-700 align-top ${j === 0 ? 'font-medium text-navy-600 whitespace-nowrap' : ''}`}>
                  {cell.startsWith('http') ? (
                    <a href={cell} target="_blank" rel="noopener noreferrer" className="text-navy-500 hover:underline break-all">{cell}</a>
                  ) : cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
