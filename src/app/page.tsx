import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  QrCode, ShieldCheck, FileText, ArrowRight, CheckCircle, CheckCircle2, XCircle,
  ChevronRight, Users, Globe, ClipboardList, RefreshCw, Lock, LayoutDashboard,
  Search, MessageSquare, Database, KeyRound, Mail, TrendingUp, ClipboardCheck, Coins, Tag,
  Sparkles, Zap, Scale, Building2, Plus,
} from 'lucide-react'
import { Logo } from '@/components/logo'

// ─────────────────────────────────────────────────────────────
// 共通パーツ
// ─────────────────────────────────────────────────────────────
function Eyebrow({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return (
    <p className={`inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.18em] uppercase mb-4 ${light ? 'text-navy-200' : 'text-navy-600'}`}>
      <span className={`w-5 h-px ${light ? 'bg-navy-300' : 'bg-navy-400'}`} />
      {children}
    </p>
  )
}

function BrowserFrame({ url, children, className = '' }: { url: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-200 shadow-[0_30px_80px_-20px_rgba(15,23,42,0.25)] overflow-hidden ${className}`}>
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-gray-50/80">
        <div className="flex gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-gray-300" />
          <span className="w-2.5 h-2.5 rounded-full bg-gray-300" />
          <span className="w-2.5 h-2.5 rounded-full bg-gray-300" />
        </div>
        <div className="flex-1 mx-3">
          <div className="bg-white border border-gray-200 rounded-md px-3 py-1 text-[11px] text-gray-400 max-w-xs mx-auto text-center font-mono">{url}</div>
        </div>
      </div>
      {children}
    </div>
  )
}

const OTA = {
  beds24: 'text-blue-700 bg-blue-50 border-blue-200',
  airhost: 'text-purple-700 bg-purple-50 border-purple-200',
}

export default async function LandingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-white text-gray-900 antialiased">

      {/* ============ NAV ============ */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/85 backdrop-blur-md border-b border-gray-200/70">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Logo variant="white" size="sm" />
          <div className="hidden md:flex items-center gap-7 text-sm text-gray-600">
            <Link href="#features" className="hover:text-gray-900 transition-colors">機能</Link>
            <Link href="#all-features" className="hover:text-gray-900 transition-colors">機能一覧</Link>
            <Link href="#flow" className="hover:text-gray-900 transition-colors">導入の流れ</Link>
            <Link href="#trust" className="hover:text-gray-900 transition-colors">法令・セキュリティ</Link>
            <Link href="#faq" className="hover:text-gray-900 transition-colors">FAQ</Link>
          </div>
          <div className="flex items-center gap-3">
            <a href="https://united-futures.com/contact/" target="_blank" rel="noopener noreferrer" className="hidden sm:block text-sm text-gray-600 hover:text-gray-900 transition-colors">お問い合わせ</a>
            {user ? (
              <Link href="/dashboard" className="bg-navy-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-navy-700 transition-colors">ダッシュボード</Link>
            ) : (
              <>
                <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">ログイン</Link>
                <Link href="/signup" className="bg-navy-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-navy-700 transition-colors shadow-sm">無料で始める</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ============ HERO ============ */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        {/* 背景装飾 */}
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(79,70,229,0.10),transparent_55%),linear-gradient(to_bottom,#f8fafc,#ffffff)]" />
        <div className="absolute inset-0 -z-10 opacity-[0.35] bg-[linear-gradient(to_right,rgba(148,163,184,0.15)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.15)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />

        <div className="max-w-6xl mx-auto">
          <div className="max-w-3xl mx-auto text-center mb-14">
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-navy-700 bg-navy-50 border border-navy-100 rounded-full px-3.5 py-1.5 mb-6">
              <Sparkles size={13} /> 宿泊施設向け 予約・ゲスト管理クラウド
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-[3.75rem] font-black leading-[1.12] tracking-tight mb-6">
              予約からゲスト対応、<br className="hidden sm:block" />
              売上・法令報告まで。<br />
              <span className="bg-gradient-to-r from-navy-700 via-indigo-600 to-navy-500 bg-clip-text text-transparent">宿泊運営を、ひとつに。</span>
            </h1>
            <p className="text-lg text-gray-600 leading-relaxed max-w-2xl mx-auto mb-9">
              Beds24・Airhostから予約を自動同期。宿泊者名簿・セルフチェックイン・アンケートから、
              ゲストメッセージ、売上レポート、宿泊実績報告、宿泊税、宿泊価格の調整まで。
              バラバラだった運営業務を、ひとつのダッシュボードで。
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/signup" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-navy-600 text-white font-bold text-base px-8 py-4 rounded-xl hover:bg-navy-700 transition-colors shadow-lg shadow-navy-200/60">
                無料で始める <ArrowRight size={16} />
              </Link>
              <a href="https://united-futures.com/contact/" target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-gray-800 font-medium text-base px-8 py-4 rounded-xl border border-gray-300 bg-white/70 hover:bg-white transition-colors">
                導入の相談をする <ChevronRight size={16} />
              </a>
            </div>
            <p className="text-xs text-gray-400 mt-4">機器の購入・工事は不要。メールアドレスだけで今日から始められます。</p>
          </div>

          {/* ── ヒーロー ビジュアル ── */}
          <div className="relative max-w-5xl mx-auto">
            <BrowserFrame url="guestfollow.jp/dashboard">
              <div className="grid grid-cols-3 gap-3 px-6 pt-5">
                {[
                  { label: '今日のチェックイン', value: '3', tone: 'text-navy-700 bg-navy-50 border-navy-100' },
                  { label: '今週の到着予定', value: '12', tone: 'text-indigo-700 bg-indigo-50 border-indigo-100' },
                  { label: '名簿未登録（今後）', value: '2', tone: 'text-red-600 bg-red-50 border-red-100' },
                ].map(s => (
                  <div key={s.label} className={`rounded-xl border px-4 py-3 ${s.tone}`}>
                    <p className="text-[11px] font-medium opacity-80">{s.label}</p>
                    <p className="text-2xl font-black">{s.value}</p>
                  </div>
                ))}
              </div>
              <div className="p-6">
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="grid grid-cols-[1.6fr_1.2fr_1fr_1fr_1fr] gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-200 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                    <div>施設 / 連携元</div><div>チェックイン</div>
                    <div className="text-center">名簿</div><div className="text-center">チェックイン</div><div className="text-center">アンケート</div>
                  </div>
                  {[
                    { name: 'コテージA', ota: 'Beds24', tone: OTA.beds24, date: '7/18', guest: '山田 太郎', s: [true, true, true], today: true },
                    { name: 'ヴィラC', ota: 'Airhost', tone: OTA.airhost, date: '7/19', guest: '鈴木 花子', s: [true, false, false] },
                    { name: 'ロッジB', ota: 'Beds24', tone: OTA.beds24, date: '7/21', guest: 'John Smith', s: [false, false, false] },
                  ].map(b => (
                    <div key={b.name} className={`grid grid-cols-[1.6fr_1.2fr_1fr_1fr_1fr] gap-2 px-4 py-3 items-center border-b border-gray-100 last:border-b-0 ${b.today ? 'bg-navy-50/40 border-l-2 border-l-navy-500' : ''}`}>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-xs font-semibold text-gray-800 truncate">{b.name}</span>
                        <span className={`text-[9px] font-bold border rounded px-1 py-0.5 shrink-0 ${b.tone}`}>{b.ota}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-gray-700 font-medium">{b.date}</p>
                        <p className="text-[10px] text-gray-400 truncate">{b.guest}</p>
                      </div>
                      {b.s.map((ok, i) => (
                        <div key={i} className="flex justify-center">
                          {ok
                            ? <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-1.5 py-0.5"><CheckCircle2 size={9} /> 済</span>
                            : <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-red-600 bg-red-50 border border-red-200 rounded-full px-1.5 py-0.5"><XCircle size={9} /> 未</span>}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </BrowserFrame>

            {/* フローティングカード */}
            <div className="hidden lg:block absolute -left-8 top-24 bg-white rounded-xl border border-gray-200 shadow-xl px-4 py-3 w-52">
              <p className="text-[10px] text-gray-500 mb-1">今月の粗利益</p>
              <p className="text-xl font-black text-navy-700">¥1,115,800</p>
              <p className="text-[10px] text-green-600 mt-0.5 flex items-center gap-1"><TrendingUp size={11} /> 売上・手数料を自動集計</p>
            </div>
            <div className="hidden lg:block absolute -right-8 bottom-16 bg-white rounded-xl border border-gray-200 shadow-xl px-4 py-3 w-56">
              <p className="text-[10px] text-gray-500 mb-1.5">セルフチェックイン</p>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-navy-50 border border-navy-100 flex items-center justify-center"><QrCode size={16} className="text-navy-600" /></div>
                <div><p className="text-xs font-bold text-gray-800">QR × パスキー</p><p className="text-[10px] text-gray-400">本人確認後に暗証番号を発行</p></div>
              </div>
            </div>
          </div>

          {/* 連携バー */}
          <div className="max-w-3xl mx-auto mt-12 text-center">
            <p className="text-[11px] text-gray-400 tracking-wider mb-3">INTEGRATIONS ・ サイトコントローラー連携（複数アカウント対応）</p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <span className={`text-sm font-bold rounded-lg px-5 py-2.5 border ${OTA.beds24}`}>Beds24</span>
              <span className={`text-sm font-bold rounded-lg px-5 py-2.5 border ${OTA.airhost}`}>Airhost</span>
              <span className="text-sm font-medium text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-5 py-2.5">手動登録にも対応</span>
            </div>
          </div>
        </div>
      </section>

      {/* ============ VALUE（3つの価値） ============ */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <Eyebrow>Why GuestFollow</Eyebrow>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-4">宿泊運営の「面倒」を、まるごと引き受ける。</h2>
            <p className="text-gray-600 leading-relaxed">複数OTAに散らばる予約、手作業の名簿と本人確認、後回しになる数字と法定報告。GuestFollowは、この3つを一度に解決します。</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: LayoutDashboard, title: '一元管理', lead: '散らばった情報を、1画面に。', body: 'Beds24・Airhostの予約と施設を自動で同期し、名簿・チェックイン・アンケート・メッセージの状況を予約ごとに一覧表示。対応が必要なゲストが一目でわかります。' },
              { icon: Zap, title: '自動化', lead: '手作業を、仕組みに。', body: '名簿はゲストが自己入力、チェックインはQR×パスキーで無人化。売上・粗利益、宿泊実績、宿泊税まで自動集計し、CSV/PDFで出力できます。' },
              { icon: Scale, title: '法令対応', lead: '守るべきことを、標準で。', body: '旅館業法改正（無人施設の本人確認）、住宅宿泊事業法 第14条の定期報告、自治体ごとの宿泊税に対応。保健所への説明資料としても使えます。' },
            ].map(({ icon: Icon, title, lead, body }) => (
              <div key={title} className="group relative bg-gradient-to-b from-gray-50 to-white rounded-2xl border border-gray-200 p-8 hover:border-navy-200 hover:shadow-xl hover:shadow-navy-100/40 transition-all">
                <div className="w-12 h-12 rounded-xl bg-navy-600 text-white flex items-center justify-center mb-6 shadow-md shadow-navy-200">
                  <Icon size={22} />
                </div>
                <p className="text-xs font-bold text-navy-600 tracking-wider mb-1">{title}</p>
                <h3 className="text-xl font-black text-gray-900 mb-3">{lead}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ FEATURES（課題→解決、交互レイアウト） ============ */}
      <section className="py-24 px-6 bg-gray-50 border-y border-gray-100" id="features">
        <div className="max-w-6xl mx-auto space-y-28">

          <div className="text-center max-w-2xl mx-auto">
            <Eyebrow>Features</Eyebrow>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-4">それぞれの課題に、それぞれの答えを。</h2>
            <p className="text-gray-600">「なぜ必要か」と「何ができるか」を、機能ごとにご紹介します。</p>
          </div>

          {/* ── 1. 予約管理ハブ ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
            <div>
              <Eyebrow>01 ・ Reservation Hub</Eyebrow>
              <h3 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight mb-4">すべての予約が、<br />ステータスつきで一列に。</h3>
              <div className="rounded-xl bg-white border border-gray-200 p-4 mb-5">
                <p className="text-[11px] font-bold text-red-500 mb-1">こんな課題に</p>
                <p className="text-sm text-gray-700">複数のOTA・複数のサイトコントローラーに予約が分かれ、全体の状況を把握できない。誰が名簿未登録か、誰がチェックイン済みか追えない。</p>
              </div>
              <ul className="space-y-3">
                {[
                  { icon: RefreshCw, t: 'Beds24・Airhostから施設と予約を自動同期（複数アカウント可）' },
                  { icon: LayoutDashboard, t: '名簿・チェックイン・アンケートの進捗を予約ごとに表示' },
                  { icon: Search, t: '施設・期間・ステータス・ゲスト名でフィルタ／検索' },
                  { icon: Mail, t: '予約ごとの登録URLをワンクリックでコピー・メール送付' },
                ].map(({ icon: Icon, t }) => (
                  <li key={t} className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-navy-600 text-white flex items-center justify-center shrink-0 mt-0.5"><Icon size={12} /></span>
                    <span className="text-sm text-gray-700 leading-relaxed">{t}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xl shadow-gray-200/60 p-5 space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-900">ロッジB</span>
                  <span className={`text-[10px] font-bold border rounded px-1.5 py-0.5 ${OTA.beds24}`}>Beds24</span>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-600 bg-red-50 border border-red-200 rounded-full px-2 py-0.5"><XCircle size={10} /> 名簿未</span>
              </div>
              <p className="text-xs font-semibold text-gray-500">この予約の宿泊者登録URL（ゲストに送付）</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-[11px] bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 truncate text-gray-500 font-mono">guestfollow.jp/pre-checkin/a8f3…</code>
                <span className="shrink-0 text-[11px] font-medium text-gray-600 bg-white border border-gray-200 rounded-lg px-3 py-2">コピー</span>
              </div>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-1.5"><Mail size={11} /> 登録案内メールを送る</span>
              <div className="pt-3 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-500 mb-2">登録が完了すると…</p>
                <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-800">John Smith</span>
                    <span className="inline-flex items-center gap-1 text-[10px] text-blue-700 bg-blue-50 rounded-full px-2 py-0.5"><Globe size={9} /> アメリカ</span>
                  </div>
                  <p className="text-[11px] text-gray-500">123 Main St, San Francisco ／ +1-415-…</p>
                  <p className="text-[11px] text-green-600 flex items-center gap-1"><CheckCircle2 size={10} /> チェックイン: 7/21 15:02</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── 2. ゲストジャーニー ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
            <div className="order-2 lg:order-1 grid grid-cols-1 gap-3">
              {[
                { icon: FileText, step: '滞在前', title: '宿泊者名簿', body: '登録URLを送るだけ。氏名・住所・連絡先、外国人はパスポート情報まで自己入力で収集し、旅館業法準拠で3年間保存。', pts: ['予約情報を自動補完', 'パスポート画像対応', 'CSV出力'] },
                { icon: QrCode, step: '滞在当日', title: 'セルフチェックイン', body: '玄関のQRをスキャンし、パスキー（Face ID／指紋）で本人確認。認証後にのみ暗証番号を表示。', pts: ['アプリ不要', '顔写真を自動撮影', 'RemoteLOCK連動'] },
                { icon: ClipboardList, step: '滞在後', title: 'アンケート', body: '満足度・コメントを自動収集。☆5ならGoogleレビューへ誘導、☆4以下は改善点をヒアリング。', pts: ['設問カスタマイズ', 'Googleレビュー誘導', '回答は予約一覧に反映'] },
              ].map(({ icon: Icon, step, title, body, pts }) => (
                <div key={title} className="flex gap-4 bg-white rounded-2xl border border-gray-200 p-5 hover:border-navy-200 hover:shadow-lg hover:shadow-navy-100/30 transition-all">
                  <div className="w-11 h-11 rounded-xl bg-navy-50 border border-navy-100 flex items-center justify-center shrink-0"><Icon size={20} className="text-navy-600" /></div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-black text-gray-900">{title}</h4>
                      <span className="text-[10px] font-bold text-gray-400 bg-gray-50 border border-gray-200 rounded-full px-2 py-0.5">{step}</span>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed mb-2">{body}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {pts.map(p => <span key={p} className="inline-flex items-center gap-1 text-[11px] text-gray-600 bg-gray-50 border border-gray-200 rounded-full px-2 py-0.5"><CheckCircle size={10} className="text-green-500" />{p}</span>)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="order-1 lg:order-2">
              <Eyebrow>02 ・ Guest Journey</Eyebrow>
              <h3 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight mb-4">滞在前・当日・滞在後。<br />ゲスト対応を、無人でも安全に。</h3>
              <div className="rounded-xl bg-white border border-gray-200 p-4 mb-5">
                <p className="text-[11px] font-bold text-red-500 mb-1">こんな課題に</p>
                <p className="text-sm text-gray-700">義務化された名簿収集・本人確認を紙やスプレッドシートで回すのは限界。無人運営で鍵の受け渡しも不安。チェックアウト後の満足度も把握できない。</p>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">ゲストがスマホで自己完結できる導線を用意し、施設側は進捗を見守るだけ。すべての記録は予約に紐づいて残ります。</p>
            </div>
          </div>

          {/* ── 3. 運営・経営 ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
            <div>
              <Eyebrow>03 ・ Management &amp; Reporting</Eyebrow>
              <h3 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight mb-4">数字と報告業務も、<br />予約データからそのまま。</h3>
              <div className="rounded-xl bg-white border border-gray-200 p-4 mb-5">
                <p className="text-[11px] font-bold text-red-500 mb-1">こんな課題に</p>
                <p className="text-sm text-gray-700">売上や手数料の集計、隔月の民泊定期報告、自治体ごとに違う宿泊税、OTAごとの価格調整。毎回スプレッドシートに転記するのはもう限界。</p>
              </div>
              <ul className="space-y-3">
                {[
                  { icon: MessageSquare, t: 'ゲストメッセージ：Beds24のやり取りを予約ごとに表示・返信' },
                  { icon: TrendingUp, t: '売上レポート：売上／OTA手数料／粗利益を自動集計、CSV/PDF' },
                  { icon: ClipboardCheck, t: '宿泊実績報告：民泊法14条の隔月報告を届出住宅ごとに自動集計' },
                  { icon: Coins, t: '宿泊税計算：自治体プリセット／段階定額・定率に対応' },
                  { icon: Tag, t: '宿泊価格：平日／土曜／祝前日ルールで自動プライシング→Beds24へ反映' },
                ].map(({ icon: Icon, t }) => (
                  <li key={t} className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-navy-600 text-white flex items-center justify-center shrink-0 mt-0.5"><Icon size={12} /></span>
                    <span className="text-sm text-gray-700 leading-relaxed">{t}</span>
                  </li>
                ))}
              </ul>
            </div>
            <BrowserFrame url="guestfollow.jp/dashboard/reports">
              <div className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp size={16} className="text-navy-600" />
                  <span className="text-sm font-black text-gray-900">売上レポート</span>
                  <span className="ml-auto text-[10px] text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1">2026年7月 ・ 全施設</span>
                </div>
                <div className="grid grid-cols-3 gap-2.5 mb-4">
                  {[
                    { l: '売上（総額）', v: '¥1,284,000', t: 'bg-gray-50 border-gray-200 text-gray-900' },
                    { l: 'OTA手数料', v: '−¥168,200', t: 'bg-amber-50 border-amber-200 text-amber-700' },
                    { l: '粗利益', v: '¥1,115,800', t: 'bg-navy-50 border-navy-200 text-navy-700' },
                  ].map(x => (
                    <div key={x.l} className={`rounded-xl border px-3 py-2.5 ${x.t}`}>
                      <p className="text-[10px] opacity-80">{x.l}</p>
                      <p className="text-base sm:text-lg font-black">{x.v}</p>
                    </div>
                  ))}
                </div>
                <div className="border border-gray-200 rounded-xl overflow-hidden text-[11px]">
                  {[
                    { n: 'コテージA', d: '7/10〜13', s: '¥92,600', f: '−¥11,100', p: '¥81,500' },
                    { n: 'ロッジB', d: '7/17〜19', s: '¥57,700', f: '−¥6,900', p: '¥50,800' },
                    { n: 'ヴィラC', d: '7/24〜26', s: '¥126,000', f: '—', p: '¥126,000' },
                  ].map(r => (
                    <div key={r.n} className="grid grid-cols-[1.4fr_1fr_1fr_1fr_1fr] gap-2 px-3 py-2.5 border-b border-gray-100 last:border-b-0 items-center">
                      <span className="font-semibold text-gray-800 truncate">{r.n}</span>
                      <span className="text-gray-500">{r.d}</span>
                      <span className="text-right font-semibold text-gray-900">{r.s}</span>
                      <span className="text-right text-amber-700">{r.f}</span>
                      <span className="text-right font-bold text-navy-700">{r.p}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <span className="inline-flex items-center gap-1 text-[10px] text-gray-600 bg-white border border-gray-200 rounded-lg px-2.5 py-1.5"><FileText size={11} /> CSV</span>
                  <span className="inline-flex items-center gap-1 text-[10px] text-white bg-navy-600 rounded-lg px-2.5 py-1.5"><FileText size={11} /> PDF</span>
                </div>
              </div>
            </BrowserFrame>
          </div>
        </div>
      </section>

      {/* ============ ALL FEATURES（一覧） ============ */}
      <section className="py-24 px-6 bg-white" id="all-features">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <Eyebrow>All Features</Eyebrow>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-4">できること、ぜんぶ。</h2>
            <p className="text-gray-600">機能はすべて標準搭載。必要なものから使い始められます。</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[
              { icon: RefreshCw, t: '予約自動同期', d: 'Beds24／Airhost、複数アカウント' },
              { icon: FileText, t: '宿泊者名簿', d: '自己入力・3年保存・CSV' },
              { icon: QrCode, t: 'セルフチェックイン', d: 'QR×パスキー・暗証番号発行' },
              { icon: ClipboardList, t: 'アンケート', d: '満足度・Googleレビュー誘導' },
              { icon: MessageSquare, t: 'ゲストメッセージ', d: 'Beds24の送受信を一元化' },
              { icon: TrendingUp, t: '売上レポート', d: '売上・手数料・粗利益、PDF' },
              { icon: ClipboardCheck, t: '宿泊実績報告', d: '民泊法14条 隔月報告' },
              { icon: Coins, t: '宿泊税計算', d: '自治体別ルール・自動集計' },
              { icon: Tag, t: '宿泊価格', d: '自動プライシング・Beds24反映' },
              { icon: Users, t: 'チーム共同管理', d: '招待・役割（管理／清掃）' },
              { icon: KeyRound, t: 'スマートロック連動', d: 'RemoteLOCK・認証後のみ解錠' },
              { icon: Globe, t: 'インバウンド対応', d: '15言語・旅券情報の取得' },
            ].map(({ icon: Icon, t, d }) => (
              <div key={t} className="group rounded-2xl border border-gray-200 bg-white p-5 hover:border-navy-200 hover:shadow-lg hover:shadow-navy-100/30 hover:-translate-y-0.5 transition-all">
                <div className="w-10 h-10 rounded-xl bg-navy-50 border border-navy-100 flex items-center justify-center mb-4 group-hover:bg-navy-600 group-hover:border-navy-600 transition-colors">
                  <Icon size={18} className="text-navy-600 group-hover:text-white transition-colors" />
                </div>
                <h3 className="font-bold text-gray-900 text-sm mb-1">{t}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ FLOW ============ */}
      <section className="py-24 px-6 bg-navy-800 text-white" id="flow">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <Eyebrow light>Getting Started</Eyebrow>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">導入は、今日から。4ステップ。</h2>
            <p className="text-navy-200 mt-3 text-sm">機器の購入や工事は不要。最短10分で予約が並びます。</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { n: '01', icon: Building2, t: 'アカウント作成', b: 'メールアドレスだけで登録完了。' },
              { n: '02', icon: RefreshCw, t: 'サイトコントローラー連携', b: 'Beds24・AirhostのAPIトークンを登録。施設と予約が自動で並びます。' },
              { n: '03', icon: Mail, t: 'ゲストに登録URLを送付', b: '予約一覧からコピーまたはメール送信。ゲストが名簿を自己入力。' },
              { n: '04', icon: QrCode, t: 'チェックイン＆フォロー', b: '当日はQR×パスキー。チェックアウト後はアンケートで満足度を回収。' },
            ].map(({ n, icon: Icon, t, b }) => (
              <div key={n} className="relative bg-white/[0.06] rounded-2xl p-6 border border-white/10 hover:bg-white/[0.1] transition-colors">
                <div className="flex items-center justify-between mb-5">
                  <span className="text-3xl font-black text-navy-300">{n}</span>
                  <span className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center"><Icon size={18} className="text-navy-100" /></span>
                </div>
                <h3 className="font-bold text-sm mb-2">{t}</h3>
                <p className="text-navy-200 text-xs leading-relaxed">{b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ TRUST（法令＋セキュリティ） ============ */}
      <section className="py-24 px-6 bg-gray-50" id="trust">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <Eyebrow>Compliance &amp; Security</Eyebrow>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-4">法令対応と安全性は、標準装備。</h2>
            <p className="text-gray-600">令和7年4月施行の旅館業法改正（無人施設の本人確認義務）に準拠。個人情報を扱うサービスとして、当然の備えを。</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_1fr] gap-6">
            {/* 要件対応表 */}
            <div className="bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
              <div className="bg-navy-700 px-6 py-4 flex items-center gap-2">
                <ShieldCheck size={16} className="text-white" />
                <p className="text-white font-bold text-sm">旅館業法 要件対応表</p>
              </div>
              <div className="divide-y divide-gray-100">
                {[
                  { r: '本人確認情報・事前共有情報の共有', h: '登録URLで氏名・住所・連絡先を取得し、チェックイン用QRを発行' },
                  { r: '自動チェックイン機器等での照合', h: 'Face ID・指紋によるパスキー（WebAuthn）で本人確認' },
                  { r: '顔を判別できる顔確認', h: '認証直前にカメラで顔写真を自動撮影・保存（施設ごとにON/OFF）' },
                  { r: '鍵は本人確認後のみ交付', h: '照合完了後に暗証番号を発行。RemoteLOCK連動で解錠を制御' },
                  { r: '宿泊者名簿の作成・3年間保存', h: '名簿を自動生成しクラウドに3年保存。CSV出力対応' },
                  { r: '外国人宿泊者の旅券情報取得', h: 'パスポート番号・国籍・画像を取得し暗号化保存' },
                ].map(({ r, h }, i) => (
                  <div key={r} className={`grid grid-cols-1 sm:grid-cols-2 ${i % 2 ? 'bg-gray-50/60' : ''}`}>
                    <div className="px-5 py-3.5 text-sm font-medium text-gray-800 sm:border-r border-gray-100">{r}</div>
                    <div className="px-5 py-3.5 text-sm text-gray-600 flex gap-2"><CheckCircle size={14} className="text-green-500 shrink-0 mt-0.5" />{h}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* セキュリティ＋法定業務 */}
            <div className="grid grid-cols-1 gap-4">
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <p className="text-xs font-bold text-navy-600 tracking-wider mb-4">SECURITY</p>
                <ul className="space-y-3">
                  {[
                    { icon: Lock, t: '通信の暗号化', d: 'すべてHTTPS（TLS）' },
                    { icon: Database, t: 'データ保護', d: '顔写真・旅券画像は暗号化ストレージ' },
                    { icon: ShieldCheck, t: 'アクセス制御', d: 'アカウントごとにデータを分離（RLS）' },
                    { icon: FileText, t: '保存期間の管理', d: '名簿は3年保存後に自動削除' },
                  ].map(({ icon: Icon, t, d }) => (
                    <li key={t} className="flex items-start gap-3">
                      <span className="w-8 h-8 rounded-lg bg-navy-50 border border-navy-100 flex items-center justify-center shrink-0"><Icon size={15} className="text-navy-600" /></span>
                      <div><p className="text-sm font-bold text-gray-900">{t}</p><p className="text-xs text-gray-500">{d}</p></div>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <p className="text-xs font-bold text-navy-600 tracking-wider mb-3">法定業務もカバー</p>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex gap-2"><CheckCircle size={14} className="text-green-500 shrink-0 mt-0.5" />住宅宿泊事業法 第14条の定期報告（隔月）を自動集計</li>
                  <li className="flex gap-2"><CheckCircle size={14} className="text-green-500 shrink-0 mt-0.5" />自治体ごとの宿泊税（段階定額・定率）を計算</li>
                  <li className="flex gap-2"><CheckCircle size={14} className="text-green-500 shrink-0 mt-0.5" />国籍別の宿泊者内訳をOTA情報・名簿から判定</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section className="py-24 px-6 bg-white" id="faq">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <Eyebrow>FAQ</Eyebrow>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">よくあるご質問</h2>
          </div>
          <div className="divide-y divide-gray-200 border-y border-gray-200">
            {[
              { q: '導入に機器や工事は必要ですか？', a: '不要です。メールアドレスでアカウントを作成し、Beds24・AirhostのAPIトークンを登録するだけで施設と予約が同期されます。チェックインはゲストのスマホで完結します。' },
              { q: 'Beds24・Airhost以外の予約も管理できますか？', a: 'はい。手動登録に対応しています。サイトコントローラー連携済みの予約と同じ画面で管理できます。' },
              { q: '旅館業法改正（無人施設の本人確認）に対応していますか？', a: '対応しています。事前の本人確認情報の取得、パスキーによる照合、顔写真の取得、本人確認後の鍵交付、名簿の3年保存など、要件対応表のとおり標準対応です。' },
              { q: '売上や宿泊税、民泊の定期報告はどこまで自動化できますか？', a: '同期した予約から、売上・OTA手数料・粗利益、宿泊実績（宿泊日数・延べ宿泊者数・国籍別内訳）、宿泊税を自動集計し、CSV/PDFで出力できます。提出は各システム・様式に従ってご確認ください。' },
              { q: '宿泊価格の調整はOTAに反映されますか？', a: 'Beds24連携施設は、設定したルールで価格・最低宿泊日数を作成し、確認のうえBeds24へ反映できます（連携中のOTAへ配信）。反映には書き込み権限付きのトークン設定が必要です。' },
              { q: 'ゲストは日本語以外でも利用できますか？', a: 'はい。名簿・チェックイン・アンケートのゲスト向け画面は15言語に対応しています。' },
            ].map(({ q, a }) => (
              <details key={q} className="group py-5">
                <summary className="flex items-center justify-between cursor-pointer list-none">
                  <span className="text-base font-bold text-gray-900 pr-6">{q}</span>
                  <span className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center text-gray-500 group-open:rotate-45 group-open:bg-navy-600 group-open:border-navy-600 group-open:text-white transition-all shrink-0"><Plus size={14} /></span>
                </summary>
                <p className="text-sm text-gray-600 leading-relaxed mt-3 pr-10">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ============ CTA ============ */}
      <section className="py-28 px-6 relative overflow-hidden bg-gradient-to-br from-navy-700 via-navy-600 to-indigo-700">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white blur-2xl" />
          <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-white blur-2xl" />
        </div>
        <div className="max-w-3xl mx-auto text-center relative">
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-4">宿泊運営の一元管理を、<br className="hidden sm:block" />今日から始めましょう。</h2>
          <p className="text-navy-100 text-base mb-10 max-w-xl mx-auto">アカウント作成とサイトコントローラー連携だけで、すぐに使い始められます。</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white text-navy-700 font-bold text-base px-8 py-4 rounded-xl hover:bg-gray-50 transition-colors shadow-xl">
              無料でアカウントを作成 <ArrowRight size={18} />
            </Link>
            <a href="https://united-futures.com/contact/" target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto inline-flex items-center justify-center text-white font-medium text-base px-8 py-4 rounded-xl border border-white/30 hover:bg-white/10 transition-colors">
              導入の相談をする
            </a>
          </div>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="bg-gray-950 pt-14 pb-8 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pb-10 border-b border-gray-800">
            <div className="col-span-2 md:col-span-1">
              <Logo variant="default" size="sm" />
              <p className="text-gray-500 text-xs mt-3 leading-relaxed">宿泊施設向け<br />予約・ゲスト管理クラウド</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-3">プロダクト</p>
              <ul className="space-y-2 text-xs text-gray-500">
                <li><Link href="#features" className="hover:text-gray-300 transition-colors">機能</Link></li>
                <li><Link href="#all-features" className="hover:text-gray-300 transition-colors">機能一覧</Link></li>
                <li><Link href="#flow" className="hover:text-gray-300 transition-colors">導入の流れ</Link></li>
                <li><Link href="#trust" className="hover:text-gray-300 transition-colors">法令・セキュリティ</Link></li>
                <li><Link href="#faq" className="hover:text-gray-300 transition-colors">FAQ</Link></li>
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
            <a href="https://united-futures.com/" target="_blank" rel="noopener noreferrer" className="hover:text-gray-300 transition-colors">© 2026 UNITED FUTURES, INC.</a>
          </p>
        </div>
      </footer>
    </div>
  )
}
