import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  QrCode, ShieldCheck, FileText, ArrowRight,
  CheckCircle, CheckCircle2, XCircle, AlertTriangle, Building2,
  ChevronRight, Users, Globe, ClipboardList, RefreshCw, Lock, Camera,
  LayoutDashboard, Search, MessageSquare, Database, KeyRound, Mail,
  TrendingUp, ClipboardCheck, Coins,
} from 'lucide-react'
import { Logo } from '@/components/logo'

export default async function LandingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-white text-gray-900 antialiased">

      {/* ============ NAV ============ */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Logo variant="white" size="sm" />
          <div className="flex items-center gap-6">
            <Link href="#product" className="hidden md:block text-sm text-gray-600 hover:text-gray-900 transition-colors">プロダクト</Link>
            <Link href="#features" className="hidden md:block text-sm text-gray-600 hover:text-gray-900 transition-colors">機能</Link>
            <Link href="#operations" className="hidden md:block text-sm text-gray-600 hover:text-gray-900 transition-colors">売上・報告</Link>
            <Link href="#flow" className="hidden md:block text-sm text-gray-600 hover:text-gray-900 transition-colors">導入の流れ</Link>
            <Link href="#compliance" className="hidden md:block text-sm text-gray-600 hover:text-gray-900 transition-colors">法令対応</Link>
            <a href="https://united-futures.com/contact/" target="_blank" rel="noopener noreferrer" className="hidden sm:block text-sm text-gray-600 hover:text-gray-900 transition-colors">お問い合わせ</a>
            {user ? (
              <Link href="/dashboard"
                className="bg-navy-500 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-navy-600 transition-colors">
                ダッシュボード
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">ログイン</Link>
                <Link href="/signup"
                  className="bg-navy-500 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-navy-600 transition-colors">
                  無料で始める
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ============ HERO ============ */}
      <section className="pt-36 pb-16 px-6 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-3xl mx-auto text-center mb-14">
            <p className="text-xs font-bold text-navy-500 tracking-[0.2em] uppercase mb-5">
              宿泊施設向け 予約・ゲスト管理クラウド
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-black text-gray-900 leading-[1.15] tracking-tight mb-6">
              予約とゲスト対応を、<br />
              ひとつのダッシュボードに。
            </h1>
            <p className="text-lg text-gray-500 leading-relaxed max-w-2xl mx-auto mb-9">
              Beds24・Airhostから予約情報を自動で取り込み、宿泊者名簿・セルフチェックイン・アンケートから、
              ゲストメッセージ・売上レポート・宿泊実績報告・宿泊税計算まで。
              予約管理・ゲストフォロー・運営業務のすべてを一元化するクラウドサービスです。
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/signup"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-navy-500 text-white font-bold text-base px-8 py-4 rounded-xl hover:bg-navy-600 transition-colors shadow-lg shadow-navy-100">
                無料で始める
                <ArrowRight size={16} />
              </Link>
              <a href="https://united-futures.com/contact/" target="_blank" rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-gray-700 font-medium text-base px-8 py-4 rounded-xl border border-gray-300 hover:bg-gray-50 transition-colors">
                お問い合わせ
                <ChevronRight size={16} />
              </a>
            </div>
          </div>

          {/* ── プロダクトモック（予約一覧） ── */}
          <div className="max-w-5xl mx-auto">
            <div className="bg-white rounded-2xl shadow-2xl shadow-gray-300/50 border border-gray-200 overflow-hidden">
              {/* Browser bar */}
              <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100 bg-gray-50">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-gray-300" />
                  <div className="w-2.5 h-2.5 rounded-full bg-gray-300" />
                  <div className="w-2.5 h-2.5 rounded-full bg-gray-300" />
                </div>
                <div className="flex-1 mx-4">
                  <div className="bg-white border border-gray-200 rounded-md px-3 py-1 text-xs text-gray-400 max-w-xs mx-auto text-center">
                    guestfollow.jp/dashboard
                  </div>
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3 px-6 pt-5">
                {[
                  { label: '今日のチェックイン', value: '3', accent: 'text-navy-600 bg-navy-50 border-navy-100' },
                  { label: '今週の到着予定', value: '12', accent: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
                  { label: '名簿未登録（今後）', value: '2', accent: 'text-red-600 bg-red-50 border-red-100' },
                ].map(({ label, value, accent }) => (
                  <div key={label} className={`rounded-xl border px-4 py-3 ${accent}`}>
                    <p className="text-[11px] font-medium opacity-80">{label}</p>
                    <p className="text-2xl font-black">{value}</p>
                  </div>
                ))}
              </div>

              {/* Booking table */}
              <div className="p-6">
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="grid grid-cols-[1.6fr_1.2fr_1fr_1fr_1fr] gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-200 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                    <div>物件 / 連携元</div>
                    <div>チェックイン</div>
                    <div className="text-center">名簿</div>
                    <div className="text-center">チェックイン</div>
                    <div className="text-center">アンケート</div>
                  </div>
                  {[
                    { name: 'コテージA', ota: 'Beds24', otaColor: 'text-blue-600 bg-blue-50 border-blue-200', date: '7/18', guest: '山田 太郎', roster: true, checkin: true, survey: true, today: true },
                    { name: 'ヴィラC', ota: 'Airhost', otaColor: 'text-purple-600 bg-purple-50 border-purple-200', date: '7/19', guest: '鈴木 花子', roster: true, checkin: false, survey: false },
                    { name: 'ロッジB', ota: 'Beds24', otaColor: 'text-blue-600 bg-blue-50 border-blue-200', date: '7/21', guest: 'John Smith', roster: false, checkin: false, survey: false },
                  ].map(b => (
                    <div key={b.name} className={`grid grid-cols-[1.6fr_1.2fr_1fr_1fr_1fr] gap-2 px-4 py-3 items-center border-b border-gray-100 last:border-b-0 ${b.today ? 'bg-navy-50/40 border-l-2 border-l-navy-400' : ''}`}>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-xs font-semibold text-gray-800 truncate">{b.name}</span>
                        <span className={`text-[9px] font-bold border rounded px-1 py-0.5 shrink-0 ${b.otaColor}`}>{b.ota}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-gray-700 font-medium">{b.date}</p>
                        <p className="text-[10px] text-gray-400 truncate">{b.guest}</p>
                      </div>
                      {[b.roster, b.checkin, b.survey].map((ok, i) => (
                        <div key={i} className="flex justify-center">
                          {ok ? (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-1.5 py-0.5">
                              <CheckCircle2 size={9} /> 済
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-red-600 bg-red-50 border border-red-200 rounded-full px-1.5 py-0.5">
                              <XCircle size={9} /> 未
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── 連携バー ── */}
          <div className="max-w-3xl mx-auto mt-10 text-center">
            <p className="text-xs text-gray-400 mb-3">サイトコントローラー連携（複数アカウント対応）</p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <span className="text-sm font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-5 py-2.5">Beds24</span>
              <span className="text-sm font-bold text-purple-700 bg-purple-50 border border-purple-200 rounded-lg px-5 py-2.5">Airhost</span>
              <span className="text-sm font-medium text-gray-400 bg-gray-50 border border-gray-200 rounded-lg px-5 py-2.5">手動登録にも対応</span>
            </div>
          </div>
        </div>
      </section>

      {/* ============ PROBLEM ============ */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-bold text-navy-500 tracking-[0.2em] uppercase mb-3">Problem</p>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
              宿泊運営の情報は、分散しがちです。
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                icon: Search,
                title: '予約情報がバラバラ',
                body: '複数のOTA・複数のサイトコントローラーに予約が分かれ、全体の状況をひと目で把握できない。',
              },
              {
                icon: FileText,
                title: '名簿・本人確認が手作業',
                body: '旅館業法で義務化された宿泊者名簿の収集・3年保存・本人確認を、紙やスプレッドシートで管理し続けるのは限界がある。',
              },
              {
                icon: MessageSquare,
                title: 'ゲストの声が見えない',
                body: 'チェックイン状況やチェックアウト後の満足度が把握できず、フォローや改善のタイミングを逃してしまう。',
              },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="bg-gray-50 rounded-2xl p-7 border border-gray-100">
                <div className="w-11 h-11 rounded-xl bg-white border border-gray-200 flex items-center justify-center mb-5">
                  <Icon size={20} className="text-navy-500" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ PRODUCT（予約管理ハブ） ============ */}
      <section className="py-24 px-6 bg-gray-50" id="product">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-xs font-bold text-navy-500 tracking-[0.2em] uppercase mb-3">Reservation Hub</p>
              <h2 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight leading-tight mb-5">
                すべての予約が、<br />ステータスつきで一列に。
              </h2>
              <p className="text-gray-500 leading-relaxed mb-8">
                サイトコントローラーと連携するだけで、施設と予約情報を自動で取り込み。
                予約ごとに「名簿登録・チェックイン・アンケート」の進捗が一覧に表示されるので、
                対応が必要なゲストがひと目でわかります。
              </p>
              <ul className="space-y-3.5">
                {[
                  { icon: RefreshCw, text: 'Beds24・Airhostから施設と予約を自動取込（複数アカウント可）' },
                  { icon: LayoutDashboard, text: '名簿・チェックイン・アンケートの進捗を予約ごとに表示' },
                  { icon: Search, text: '施設・期間・ステータス・ゲスト名でフィルタリング／検索' },
                  { icon: Mail, text: '予約ごとの登録URLをワンクリックでコピー・メール送付' },
                ].map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-navy-50 border border-navy-100 flex items-center justify-center shrink-0 mt-0.5">
                      <Icon size={12} className="text-navy-600" />
                    </div>
                    <span className="text-sm text-gray-700 leading-relaxed">{text}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 右：展開パネルのモック */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xl shadow-gray-200/60 p-5 space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-900">ロッジB</span>
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5">Beds24</span>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-600 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
                  <XCircle size={10} /> 名簿未
                </span>
              </div>
              <p className="text-xs font-semibold text-gray-500">この予約の宿泊者登録URL（ゲストに送付）</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-[11px] bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 truncate text-gray-500 font-mono">
                  guestfollow.jp/pre-checkin/a8f3…
                </code>
                <span className="shrink-0 text-[11px] font-medium text-gray-600 bg-white border border-gray-200 rounded-lg px-3 py-2">コピー</span>
              </div>
              <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-1.5">
                <Mail size={11} /> 登録案内メールを送る
              </div>
              <div className="pt-3 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-500 mb-2">登録が完了すると…</p>
                <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-800">John Smith</span>
                    <span className="inline-flex items-center gap-1 text-[10px] text-blue-600 bg-blue-50 rounded-full px-2 py-0.5">
                      <Globe size={9} /> アメリカ
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500">123 Main St, San Francisco ／ +1-415-…</p>
                  <p className="text-[11px] text-green-600 flex items-center gap-1">
                    <CheckCircle2 size={10} /> チェックイン: 7/21 15:02
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ FEATURES（3つのゲスト機能） ============ */}
      <section className="py-24 px-6 bg-white" id="features">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-bold text-navy-500 tracking-[0.2em] uppercase mb-3">Guest Journey</p>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight mb-4">
              ゲストフォローに必要な3つの機能。
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto text-sm leading-relaxed">
              事前の名簿収集から、当日のチェックイン、滞在後のアンケートまで。
              ゲスト対応のすべてが予約情報とつながっています。
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                icon: FileText,
                step: '滞在前',
                title: '宿泊者名簿',
                body: '予約ごとの登録URLをゲストに送るだけ。氏名・住所・連絡先、外国人はパスポート情報まで自己入力で収集し、旅館業法準拠のかたちで3年間保存します。',
                points: ['予約情報が自動で入力補完', 'パスポート情報・画像に対応', 'CSV出力・3年間クラウド保存'],
              },
              {
                icon: QrCode,
                step: '滞在当日',
                title: 'セルフチェックイン',
                body: '施設玄関のQRコードをスキャンし、パスキー（Face ID／指紋）で本人確認。認証後にのみ暗証番号を表示し、スタッフ不在でも安全に入室できます。',
                points: ['アプリ不要・機器投資ゼロ', 'カメラで顔写真を自動撮影', 'RemoteLOCK連動に対応'],
              },
              {
                icon: ClipboardList,
                step: '滞在後',
                title: 'アンケート',
                body: 'チェックアウト後にアンケートURLを送付。満足度・コメントを自動収集し、施設ごとの評価を管理画面でまとめて確認できます。',
                points: ['星評価＋自由記述', '設問のカスタマイズ可', '回答は予約一覧に反映'],
              },
            ].map(({ icon: Icon, step, title, body, points }) => (
              <div key={title} className="flex flex-col bg-white rounded-2xl border border-gray-200 p-7 hover:shadow-lg hover:shadow-gray-100 transition-shadow">
                <div className="flex items-center justify-between mb-5">
                  <div className="w-11 h-11 rounded-xl bg-navy-50 border border-navy-100 flex items-center justify-center">
                    <Icon size={20} className="text-navy-600" />
                  </div>
                  <span className="text-[11px] font-bold text-gray-400 bg-gray-50 border border-gray-200 rounded-full px-2.5 py-1">{step}</span>
                </div>
                <h3 className="text-lg font-black text-gray-900 mb-2.5">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed mb-5 flex-1">{body}</p>
                <ul className="space-y-2 pt-4 border-t border-gray-100">
                  {points.map(p => (
                    <li key={p} className="flex items-center gap-2 text-xs text-gray-600">
                      <CheckCircle size={12} className="text-green-500 shrink-0" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* サブ機能 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            {[
              { icon: Users, title: 'チーム共同管理', body: '招待リンクで施設ごとに複数アカウント共有' },
              { icon: Camera, title: 'カメラ顔確認', body: 'チェックイン時に顔写真を撮影・保存' },
              { icon: Globe, title: 'インバウンド対応', body: '外国人ゲストの旅券情報を取得・保存' },
              { icon: KeyRound, title: 'スマートロック連動', body: 'RemoteLOCK連携・認証後のみ解錠' },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                <Icon size={18} className="text-navy-500 mb-3" />
                <h3 className="font-bold text-gray-800 text-sm mb-1">{title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ OPERATIONS & REPORTING ============ */}
      <section className="py-24 px-6 bg-gray-50" id="operations">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-bold text-navy-500 tracking-[0.2em] uppercase mb-3">Management &amp; Reporting</p>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight mb-4">
              予約管理の、その先へ。
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto text-sm leading-relaxed">
              ゲストへのメッセージ対応から、売上の把握、法令で求められる報告・宿泊税の計算まで。
              取り込んだ予約データを、そのまま運営・経営の業務に活かせます。
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[
              {
                icon: MessageSquare,
                badge: 'ゲスト対応',
                title: 'ゲストメッセージ',
                body: 'Beds24のメッセージを予約ごとに一元表示。管理画面からそのまま返信でき、OTAをまたいだやり取りの見落としを防ぎます。',
                points: ['予約に紐づくメッセージを自動同期', '管理画面から直接返信（Beds24）', '未読を予約一覧でひと目で把握'],
              },
              {
                icon: TrendingUp,
                badge: '経営',
                title: '売上レポート',
                body: 'OTAから取り込んだ予約をもとに、売上・OTA手数料・粗利益を自動集計。施設・期間・月単位で絞り込み、CSV／PDFで出力できます。',
                points: ['売上・手数料・粗利益の3分割表示', 'チェックイン／アウト基準を切替', 'CSV・PDF出力（月・施設で絞込）'],
              },
              {
                icon: ClipboardCheck,
                badge: '民泊法',
                title: '宿泊実績報告',
                body: '住宅宿泊事業法 第14条の定期報告に必要な、宿泊日数・宿泊者数・延べ宿泊者数・国籍別内訳を、届出住宅ごとに自動集計します。',
                points: ['隔月の報告対象期間を自動プリセット', '施設ごとの国籍別内訳を集計', '行をタップで宿泊明細まで確認'],
              },
              {
                icon: Coins,
                badge: '税務',
                title: '宿泊税計算',
                body: '自治体ごとに異なる宿泊税を、施設ごとに設定して自動計算。段階定額・定率の両方式に対応し、主要都市のプリセットも用意しています。',
                points: ['東京・大阪・京都などプリセット対応', '段階定額・定率の両方式に対応', '期間指定でCSV・PDF出力'],
              },
            ].map(({ icon: Icon, badge, title, body, points }) => (
              <div key={title} className="flex flex-col bg-white rounded-2xl border border-gray-200 p-7 hover:shadow-lg hover:shadow-gray-100 transition-shadow">
                <div className="flex items-center justify-between mb-5">
                  <div className="w-11 h-11 rounded-xl bg-navy-50 border border-navy-100 flex items-center justify-center">
                    <Icon size={20} className="text-navy-600" />
                  </div>
                  <span className="text-[11px] font-bold text-gray-400 bg-gray-50 border border-gray-200 rounded-full px-2.5 py-1">{badge}</span>
                </div>
                <h3 className="text-lg font-black text-gray-900 mb-2.5">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed mb-5 flex-1">{body}</p>
                <ul className="space-y-2 pt-4 border-t border-gray-100">
                  {points.map(p => (
                    <li key={p} className="flex items-center gap-2 text-xs text-gray-600">
                      <CheckCircle size={12} className="text-green-500 shrink-0" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* ── 画面イメージ：売上レポート（メイン） ── */}
          <div className="mt-14 max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl shadow-2xl shadow-gray-300/50 border border-gray-200 overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100 bg-gray-50">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-gray-300" />
                  <div className="w-2.5 h-2.5 rounded-full bg-gray-300" />
                  <div className="w-2.5 h-2.5 rounded-full bg-gray-300" />
                </div>
                <div className="flex-1 mx-4">
                  <div className="bg-white border border-gray-200 rounded-md px-3 py-1 text-xs text-gray-400 max-w-xs mx-auto text-center">
                    guestfollow.jp/dashboard/reports
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp size={18} className="text-navy-600" />
                  <span className="text-sm font-black text-gray-900">売上レポート</span>
                  <span className="ml-auto text-[10px] font-medium text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1">2026年7月 ・ 全施設</span>
                </div>
                {/* 3タイル */}
                <div className="grid grid-cols-3 gap-3 mb-5">
                  {[
                    { label: '売上（総額）', value: '¥1,284,000', tone: 'bg-gray-50 border-gray-200 text-gray-900' },
                    { label: 'OTA手数料', value: '−¥168,200', tone: 'bg-amber-50 border-amber-200 text-amber-700' },
                    { label: '粗利益', value: '¥1,115,800', tone: 'bg-navy-50 border-navy-200 text-navy-700' },
                  ].map(t => (
                    <div key={t.label} className={`rounded-xl border px-4 py-3 ${t.tone}`}>
                      <p className="text-[10px] font-medium opacity-80">{t.label}</p>
                      <p className="text-lg sm:text-xl font-black">{t.value}</p>
                    </div>
                  ))}
                </div>
                {/* テーブル */}
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="grid grid-cols-[1.6fr_1.3fr_1fr_1fr_1fr] gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-200 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                    <div>物件 / OTA</div>
                    <div>宿泊日</div>
                    <div className="text-right">売上</div>
                    <div className="text-right">手数料</div>
                    <div className="text-right">粗利益</div>
                  </div>
                  {[
                    { name: 'コテージA', ota: 'Beds24', otaColor: 'text-blue-600 bg-blue-50 border-blue-200', date: '7/10〜13', sales: '¥92,600', fee: '−¥11,100', profit: '¥81,500' },
                    { name: 'ロッジB', ota: 'Beds24', otaColor: 'text-blue-600 bg-blue-50 border-blue-200', date: '7/17〜19', sales: '¥57,700', fee: '−¥6,900', profit: '¥50,800' },
                    { name: 'ヴィラC', ota: 'Airhost', otaColor: 'text-purple-600 bg-purple-50 border-purple-200', date: '7/24〜26', sales: '¥126,000', fee: '—', profit: '¥126,000' },
                  ].map(r => (
                    <div key={r.name} className="grid grid-cols-[1.6fr_1.3fr_1fr_1fr_1fr] gap-2 px-4 py-3 items-center border-b border-gray-100 last:border-b-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-xs font-semibold text-gray-800 truncate">{r.name}</span>
                        <span className={`text-[9px] font-bold border rounded px-1 py-0.5 shrink-0 ${r.otaColor}`}>{r.ota}</span>
                      </div>
                      <div className="text-xs text-gray-600">{r.date}</div>
                      <div className="text-xs font-semibold text-gray-900 text-right">{r.sales}</div>
                      <div className="text-xs text-amber-700 text-right">{r.fee}</div>
                      <div className="text-xs font-bold text-navy-700 text-right">{r.profit}</div>
                    </div>
                  ))}
                  <div className="grid grid-cols-[1.6fr_1.3fr_1fr_1fr_1fr] gap-2 px-4 py-2.5 bg-navy-50 border-t border-navy-200 items-center">
                    <div className="text-[11px] font-bold text-navy-700 col-span-2">合計</div>
                    <div className="text-[11px] font-black text-gray-900 text-right">¥1,284,000</div>
                    <div className="text-[11px] font-bold text-amber-700 text-right">−¥168,200</div>
                    <div className="text-[11px] font-black text-navy-700 text-right">¥1,115,800</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-4">
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-gray-600 bg-white border border-gray-200 rounded-lg px-2.5 py-1.5"><FileText size={11} /> CSV出力</span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-white bg-navy-600 border border-navy-600 rounded-lg px-2.5 py-1.5"><FileText size={11} /> PDF出力</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── 画面イメージ：宿泊実績報告・宿泊税・メッセージ（コンパクト） ── */}
          <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-5 max-w-4xl mx-auto">
            {/* 宿泊実績報告 */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-lg shadow-gray-200/50 p-5">
              <div className="flex items-center gap-1.5 mb-3">
                <ClipboardCheck size={15} className="text-navy-600" />
                <span className="text-xs font-black text-gray-900">宿泊実績報告</span>
              </div>
              <div className="text-[10px] text-navy-700 bg-navy-50 border border-navy-200 rounded-lg px-2 py-1 inline-block mb-3">2026年6月1日〜7月31日 ・ 提出期限 8/15</div>
              <div className="space-y-2 mb-3">
                {[
                  { label: '宿泊日数', value: '48日' },
                  { label: '延べ宿泊者数', value: '132人泊' },
                ].map(s => (
                  <div key={s.label} className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5">
                    <span className="text-[11px] text-gray-500">{s.label}</span>
                    <span className="text-xs font-bold text-navy-700">{s.value}</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] font-semibold text-gray-500 mb-1.5">国籍内訳（人泊）</p>
              <div className="flex flex-wrap gap-1">
                <span className="text-[10px] font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5">日本 86</span>
                <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">アメリカ 22</span>
                <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">オーストラリア 14</span>
                <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">台湾 10</span>
              </div>
            </div>

            {/* 宿泊税計算 */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-lg shadow-gray-200/50 p-5">
              <div className="flex items-center gap-1.5 mb-3">
                <Coins size={15} className="text-navy-600" />
                <span className="text-xs font-black text-gray-900">宿泊税計算</span>
                <span className="ml-auto text-[10px] text-gray-500 bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5">2026年7月</span>
              </div>
              <div className="bg-navy-50 border border-navy-200 rounded-xl px-3 py-2.5 mb-3">
                <p className="text-[10px] text-navy-600">宿泊税額（合計）</p>
                <p className="text-xl font-black text-navy-700">¥46,800</p>
              </div>
              <div className="space-y-1.5">
                {[
                  { name: 'コテージA', muni: '東京都', tax: '¥18,400' },
                  { name: 'ロッジB', muni: '京都市', tax: '¥21,000' },
                  { name: 'ヴィラC', muni: '倶知安町 2%', tax: '¥7,400' },
                ].map(r => (
                  <div key={r.name} className="flex items-center justify-between text-[11px]">
                    <span className="text-gray-700 truncate mr-2">{r.name}</span>
                    <span className="text-gray-400 shrink-0 mr-2">{r.muni}</span>
                    <span className="font-bold text-navy-700 shrink-0">{r.tax}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ゲストメッセージ */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-lg shadow-gray-200/50 p-5">
              <div className="flex items-center gap-1.5 mb-3">
                <MessageSquare size={15} className="text-navy-600" />
                <span className="text-xs font-black text-gray-900">ゲストメッセージ</span>
                <span className="ml-auto text-[9px] font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded px-1 py-0.5">Beds24</span>
              </div>
              <div className="space-y-2">
                <div className="max-w-[85%]">
                  <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-3 py-2 text-[11px] text-gray-700">
                    What time can we check in?
                  </div>
                  <p className="text-[9px] text-gray-400 mt-0.5">ゲスト ・ 14:02</p>
                </div>
                <div className="max-w-[85%] ml-auto">
                  <div className="bg-navy-500 text-white rounded-2xl rounded-tr-sm px-3 py-2 text-[11px]">
                    15:00からご入室いただけます。QRとパスキーで解錠できます。
                  </div>
                  <p className="text-[9px] text-gray-400 mt-0.5 text-right">ホスト ・ 14:05</p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                <div className="flex-1 text-[10px] text-gray-400 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5">メッセージを入力…</div>
                <span className="text-[10px] font-semibold text-white bg-navy-600 rounded-lg px-2.5 py-1.5">送信</span>
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 mt-8 max-w-2xl mx-auto leading-relaxed">
            ※ 画面はイメージです。宿泊実績報告・宿泊税の集計値は提出前の下書きとしてご利用ください。最新の税率・報告様式は各自治体・制度の定めに従ってご確認ください。
          </p>
        </div>
      </section>

      {/* ============ FLOW ============ */}
      <section className="py-24 px-6 bg-navy-700" id="flow">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-bold text-navy-300 tracking-[0.2em] uppercase mb-3">Getting Started</p>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              導入は、今日から。4ステップ。
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                step: '01',
                icon: Building2,
                title: 'アカウント作成',
                body: 'メールアドレスだけで登録完了。機器の購入や工事は不要です。',
              },
              {
                step: '02',
                icon: RefreshCw,
                title: 'サイトコントローラー連携',
                body: 'Beds24・AirhostのAPIトークンを登録すると、施設と予約が自動で取り込まれます。',
              },
              {
                step: '03',
                icon: Mail,
                title: 'ゲストに登録URLを送付',
                body: '予約一覧から登録URLをコピーまたはメール送信。ゲストが名簿情報を自己入力します。',
              },
              {
                step: '04',
                icon: QrCode,
                title: 'チェックイン＆フォロー',
                body: '当日はQR×パスキーでセルフチェックイン。チェックアウト後はアンケートで満足度を回収。',
              },
            ].map(({ step, icon: Icon, title, body }) => (
              <div key={step} className="bg-white/5 rounded-2xl p-6 border border-white/10">
                <div className="flex items-center justify-between mb-5">
                  <span className="text-3xl font-black text-navy-400">{step}</span>
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                    <Icon size={18} className="text-navy-200" />
                  </div>
                </div>
                <h3 className="text-white font-bold text-sm mb-2">{title}</h3>
                <p className="text-navy-200 text-xs leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ COMPLIANCE ============ */}
      <section className="py-24 px-6 bg-gray-50" id="compliance">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-bold text-navy-500 tracking-[0.2em] uppercase mb-3">Compliance</p>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
              旅館業法改正に、標準対応。
            </h2>
            <p className="text-gray-500 text-sm mt-3 max-w-lg mx-auto">
              令和7年4月施行の旅館業法改正（無人施設の本人確認義務）に準拠。
              保健所への説明資料としてもご活用いただけます。
            </p>
          </div>

          <div className="bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
            <div className="bg-navy-500 px-6 py-4 flex items-center gap-2">
              <ShieldCheck size={16} className="text-white" />
              <p className="text-white font-bold text-sm">旅館業法 要件対応表</p>
            </div>
            <div className="divide-y divide-gray-100">
              {[
                { req: '事前に本人確認情報・事前共有情報を共有', how: '予約ごとの登録URLで氏名・住所・連絡先を取得し、チェックイン用QR（事前共有情報）を発行' },
                { req: '自動チェックイン機器等での照合', how: 'スマホのFace ID・指紋によるパスキー（WebAuthn）認証で本人確認。予約者本人以外は認証不可' },
                { req: '顔を判別できる顔確認', how: '事前登録時の顔写真に加え、チェックイン認証の直前にカメラで顔写真を自動撮影・保存（施設ごとにON/OFF可）' },
                { req: '鍵は本人確認後のみ交付', how: '照合完了後にはじめて暗証番号を発行。RemoteLOCK連動で本人確認前の解錠を防止' },
                { req: '宿泊者名簿の作成・3年間保存', how: '登録データから名簿を自動生成し、クラウドに3年間保存。CSV出力に対応' },
                { req: '外国人宿泊者の旅券情報取得', how: 'パスポート番号・国籍・旅券画像を取得し、暗号化して保存' },
              ].map(({ req, how }, i) => (
                <div key={req} className={`grid grid-cols-1 sm:grid-cols-2 gap-0 ${i % 2 === 0 ? '' : 'bg-gray-50/50'}`}>
                  <div className="px-6 py-4 flex gap-3 sm:border-r border-gray-100">
                    <AlertTriangle size={14} className="text-orange-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-gray-700 font-medium">{req}</p>
                  </div>
                  <div className="px-6 py-4 flex gap-3">
                    <CheckCircle size={14} className="text-green-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-gray-500 leading-relaxed">{how}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============ SECURITY ============ */}
      <section className="py-20 px-6 bg-white border-y border-gray-100">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-bold text-navy-500 tracking-[0.2em] uppercase mb-3">Security</p>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              個人情報を扱うサービスとしての、当然の備え。
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Lock, title: '通信の暗号化', body: 'すべての通信をHTTPS（TLS）で暗号化' },
              { icon: Database, title: 'データ保護', body: '顔写真・旅券画像は暗号化ストレージに保存' },
              { icon: ShieldCheck, title: 'アクセス制御', body: 'アカウントごとにデータを分離（行レベルセキュリティ）' },
              { icon: FileText, title: '保存期間の管理', body: '名簿は3年保存後に自動削除。同意記録も保持' },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="text-center px-4 py-6">
                <div className="w-12 h-12 rounded-2xl bg-navy-50 border border-navy-100 flex items-center justify-center mx-auto mb-4">
                  <Icon size={20} className="text-navy-600" />
                </div>
                <h3 className="font-bold text-gray-900 text-sm mb-1.5">{title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ CTA ============ */}
      <section className="py-28 px-6 bg-navy-500 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-white translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-white -translate-x-1/2 translate-y-1/2" />
        </div>
        <div className="max-w-3xl mx-auto text-center relative">
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-4">
            予約とゲスト対応の一元管理を、<br className="hidden sm:block" />今日から。
          </h2>
          <p className="text-navy-100 text-base mb-10 max-w-xl mx-auto">
            アカウント作成とサイトコントローラー連携だけで、すぐに使い始められます。
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white text-navy-700 font-bold text-base px-8 py-4 rounded-xl hover:bg-gray-50 transition-colors shadow-xl">
              無料でアカウントを作成
              <ArrowRight size={18} />
            </Link>
            <a href="https://united-futures.com/contact/" target="_blank" rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center text-navy-100 font-medium text-base px-8 py-4 rounded-xl border border-navy-400 hover:bg-navy-600 transition-colors">
              導入の相談をする
            </a>
          </div>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="bg-gray-950 pt-14 pb-8 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pb-10 border-b border-gray-800">
            <div className="col-span-2 md:col-span-1">
              <Logo variant="default" size="sm" />
              <p className="text-gray-500 text-xs mt-3 leading-relaxed">
                宿泊施設向け<br />予約・ゲスト管理クラウド
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-3">プロダクト</p>
              <ul className="space-y-2 text-xs text-gray-500">
                <li><Link href="#product" className="hover:text-gray-300 transition-colors">予約管理</Link></li>
                <li><Link href="#features" className="hover:text-gray-300 transition-colors">機能一覧</Link></li>
                <li><Link href="#operations" className="hover:text-gray-300 transition-colors">売上・報告・宿泊税</Link></li>
                <li><Link href="#flow" className="hover:text-gray-300 transition-colors">導入の流れ</Link></li>
                <li><Link href="#compliance" className="hover:text-gray-300 transition-colors">法令対応</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-3">サポート</p>
              <ul className="space-y-2 text-xs text-gray-500">
                <li><a href="https://united-futures.com/contact/" target="_blank" rel="noopener noreferrer" className="hover:text-gray-300 transition-colors">お問い合わせ</a></li>
                <li><Link href="/login" className="hover:text-gray-300 transition-colors">ログイン</Link></li>
                <li><Link href="/signup" className="hover:text-gray-300 transition-colors">アカウント作成</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-3">規約・ポリシー</p>
              <ul className="space-y-2 text-xs text-gray-500">
                <li><Link href="/tokusho" className="hover:text-gray-300 transition-colors">特定商取引法に基づく表記</Link></li>
                <li><Link href="/privacy" className="hover:text-gray-300 transition-colors">プライバシーポリシー</Link></li>
              </ul>
            </div>
          </div>
          <p className="text-gray-600 text-xs pt-6 text-center">
            <a href="https://united-futures.com/" target="_blank" rel="noopener noreferrer" className="hover:text-gray-300 transition-colors">
              © 2026 UNITED FUTURES, INC.
            </a>
          </p>
        </div>
      </footer>

    </div>
  )
}
