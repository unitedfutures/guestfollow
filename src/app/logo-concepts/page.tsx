export default function LogoConcepts() {
  return (
    <div className="min-h-screen bg-gray-100 py-16 px-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-2 text-center">GuestFollow ロゴ案</h1>
        <p className="text-gray-400 text-sm text-center mb-12">10案 — クリックして拡大イメージを確認してください</p>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">

          {/* 案1: チェックマーク＋テキスト */}
          <LogoCard label="案1" desc="チェックマーク＋ワードマーク">
            <svg viewBox="0 0 160 60" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="160" height="60" fill="white"/>
              <circle cx="22" cy="30" r="16" fill="#4F46E5"/>
              <polyline points="14,30 20,37 30,22" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
              <text x="46" y="25" fontFamily="system-ui" fontWeight="300" fontSize="13" fill="#374151">Check</text>
              <text x="46" y="42" fontFamily="system-ui" fontWeight="800" fontSize="15" fill="#4F46E5">Inn</text>
            </svg>
          </LogoCard>

          {/* 案2: 指紋 */}
          <LogoCard label="案2" desc="指紋＋チェック">
            <svg viewBox="0 0 160 60" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="160" height="60" fill="white"/>
              <g transform="translate(12,8)">
                <path d="M22 2C11 2 3 10 3 22" stroke="#C7D2FE" strokeWidth="2.5" strokeLinecap="round"/>
                <path d="M22 6C14 6 8 13 8 22" stroke="#818CF8" strokeWidth="2.5" strokeLinecap="round"/>
                <path d="M22 10C17 10 13 15 13 22" stroke="#4F46E5" strokeWidth="2.5" strokeLinecap="round"/>
                <path d="M22 14C19 14 17 17 17 22v4" stroke="#3730A3" strokeWidth="2.5" strokeLinecap="round"/>
                <path d="M22 2C33 2 41 10 41 22" stroke="#C7D2FE" strokeWidth="2.5" strokeLinecap="round"/>
                <path d="M22 6C30 6 36 13 36 22" stroke="#818CF8" strokeWidth="2.5" strokeLinecap="round"/>
                <path d="M22 10C27 10 31 15 31 22v6" stroke="#4F46E5" strokeWidth="2.5" strokeLinecap="round"/>
                <circle cx="32" cy="35" r="9" fill="#4F46E5"/>
                <polyline points="27,35 31,39 38,30" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </g>
              <text x="65" y="28" fontFamily="system-ui" fontWeight="800" fontSize="14" fill="#1E1B4B">Check</text>
              <text x="65" y="46" fontFamily="system-ui" fontWeight="800" fontSize="14" fill="#4F46E5">Inn</text>
            </svg>
          </LogoCard>

          {/* 案3: ドア */}
          <LogoCard label="案3" desc="ドア＋チェック">
            <svg viewBox="0 0 160 60" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="160" height="60" fill="white"/>
              <rect x="10" y="8" width="32" height="44" rx="3" fill="#EEF2FF" stroke="#4F46E5" strokeWidth="2"/>
              <rect x="14" y="12" width="24" height="36" rx="2" fill="#4F46E5"/>
              <circle cx="34" cy="30" r="2.5" fill="white"/>
              <path d="M26 52 L10 52" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round"/>
              <path d="M42 52 L26 52" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="34" cy="10" r="7" fill="#22C55E"/>
              <polyline points="30,10 33,13 39,6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <text x="54" y="28" fontFamily="system-ui" fontWeight="300" fontSize="12" fill="#6B7280">Check</text>
              <text x="54" y="44" fontFamily="system-ui" fontWeight="900" fontSize="16" fill="#4F46E5">Inn</text>
            </svg>
          </LogoCard>

          {/* 案4: シールド */}
          <LogoCard label="案4" desc="シールド＋CI">
            <svg viewBox="0 0 160 60" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="160" height="60" fill="white"/>
              <path d="M26 6 L42 12 L42 32 C42 42 26 50 26 50 C26 50 10 42 10 32 L10 12 Z" fill="#4F46E5"/>
              <text x="18" y="35" fontFamily="system-ui" fontWeight="900" fontSize="16" fill="white">CI</text>
              <text x="54" y="26" fontFamily="system-ui" fontWeight="300" fontSize="11" fill="#6B7280">Check</text>
              <text x="54" y="42" fontFamily="system-ui" fontWeight="900" fontSize="16" fill="#1E1B4B">Inn</text>
            </svg>
          </LogoCard>

          {/* 案5: 鍵型C */}
          <LogoCard label="案5" desc="鍵穴モチーフ">
            <svg viewBox="0 0 160 60" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="160" height="60" fill="white"/>
              <rect x="8" y="6" width="40" height="48" rx="8" fill="#1E1B4B"/>
              <circle cx="28" cy="24" r="8" fill="none" stroke="white" strokeWidth="2.5"/>
              <circle cx="28" cy="24" r="3" fill="white"/>
              <rect x="25" y="30" width="6" height="14" rx="2" fill="white"/>
              <rect x="25" y="38" width="9" height="3" rx="1.5" fill="white"/>
              <text x="58" y="27" fontFamily="system-ui" fontWeight="800" fontSize="13" fill="#1E1B4B">Check</text>
              <text x="58" y="44" fontFamily="system-ui" fontWeight="800" fontSize="14" fill="#4F46E5">Inn</text>
            </svg>
          </LogoCard>

          {/* 案6: 屋根＋チェック (横型) */}
          <LogoCard label="案6" desc="屋根＋チェック">
            <svg viewBox="0 0 160 60" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="160" height="60" fill="white"/>
              <polygon points="26,10 10,28 42,28" fill="#4F46E5"/>
              <rect x="14" y="28" width="24" height="20" rx="1" fill="#4F46E5"/>
              <rect x="21" y="34" width="10" height="14" rx="2" fill="white"/>
              <circle cx="36" cy="16" r="9" fill="#22C55E"/>
              <polyline points="32,16 35,19 41,12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <text x="54" y="28" fontFamily="system-ui" fontWeight="300" fontSize="12" fill="#6B7280">Check</text>
              <text x="54" y="44" fontFamily="system-ui" fontWeight="900" fontSize="16" fill="#4F46E5">Inn</text>
            </svg>
          </LogoCard>

          {/* 案7: グラデーション丸 */}
          <LogoCard label="案7" desc="グラデーション">
            <svg viewBox="0 0 160 60" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="grad7" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#818CF8"/>
                  <stop offset="100%" stopColor="#4F46E5"/>
                </linearGradient>
              </defs>
              <rect width="160" height="60" fill="white"/>
              <circle cx="28" cy="30" r="20" fill="url(#grad7)"/>
              <polyline points="18,30 25,38 38,21" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              <text x="58" y="26" fontFamily="system-ui" fontWeight="300" fontSize="11" fill="#9CA3AF" letterSpacing="2">CHECK</text>
              <text x="58" y="44" fontFamily="system-ui" fontWeight="900" fontSize="18" fill="#4F46E5">Inn</text>
            </svg>
          </LogoCard>

          {/* 案8: モノグラム CI */}
          <LogoCard label="案8" desc="モノグラム CI">
            <svg viewBox="0 0 160 60" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="160" height="60" fill="white"/>
              <rect x="8" y="8" width="44" height="44" rx="10" fill="#4F46E5"/>
              <text x="16" y="40" fontFamily="system-ui" fontWeight="900" fontSize="26" fill="white">CI</text>
              <text x="62" y="27" fontFamily="system-ui" fontWeight="300" fontSize="11" fill="#6B7280" letterSpacing="1">Check</text>
              <text x="62" y="44" fontFamily="system-ui" fontWeight="900" fontSize="16" fill="#1E1B4B">Inn</text>
            </svg>
          </LogoCard>

          {/* 案9: ラインアートC */}
          <LogoCard label="案9" desc="ミニマルライン">
            <svg viewBox="0 0 160 60" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="160" height="60" fill="white"/>
              <path d="M40 16 A18 18 0 1 0 40 44" stroke="#4F46E5" strokeWidth="4" strokeLinecap="round" fill="none"/>
              <line x1="10" y1="52" x2="48" y2="52" stroke="#4F46E5" strokeWidth="1.5"/>
              <polyline points="34,29 24,38 10,19" stroke="#22C55E" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" transform="rotate(180,28,28)"/>
              <text x="60" y="27" fontFamily="system-ui" fontWeight="300" fontSize="11" fill="#9CA3AF" letterSpacing="2">CHECK</text>
              <text x="60" y="46" fontFamily="system-ui" fontWeight="900" fontSize="18" fill="#4F46E5" letterSpacing="1">INN</text>
            </svg>
          </LogoCard>

          {/* 案10: 全文横並びシンプル */}
          <LogoCard label="案10" desc="シンプルワードマーク">
            <svg viewBox="0 0 160 60" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="160" height="60" fill="white"/>
              <text x="12" y="36" fontFamily="system-ui" fontWeight="300" fontSize="22" fill="#374151">Check</text>
              <text x="97" y="36" fontFamily="system-ui" fontWeight="900" fontSize="22" fill="#4F46E5">Inn</text>
              <rect x="12" y="42" width="136" height="2.5" rx="1.25" fill="#4F46E5" opacity="0.3"/>
              <rect x="12" y="42" width="60" height="2.5" rx="1.25" fill="#4F46E5"/>
            </svg>
          </LogoCard>

        </div>

        {/* ダーク背景での確認 */}
        <h2 className="text-lg font-bold text-gray-700 mt-16 mb-6 text-center">ダーク背景での見え方</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">

          <LogoCard label="案1" dark>
            <svg viewBox="0 0 160 60" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="160" height="60" fill="#1E1B4B"/>
              <circle cx="22" cy="30" r="16" fill="#818CF8"/>
              <polyline points="14,30 20,37 30,22" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
              <text x="46" y="25" fontFamily="system-ui" fontWeight="300" fontSize="13" fill="#C7D2FE">Check</text>
              <text x="46" y="42" fontFamily="system-ui" fontWeight="800" fontSize="15" fill="white">Inn</text>
            </svg>
          </LogoCard>

          <LogoCard label="案2" dark>
            <svg viewBox="0 0 160 60" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="160" height="60" fill="#1E1B4B"/>
              <g transform="translate(12,8)">
                <path d="M22 2C11 2 3 10 3 22" stroke="#3730A3" strokeWidth="2.5" strokeLinecap="round"/>
                <path d="M22 6C14 6 8 13 8 22" stroke="#4F46E5" strokeWidth="2.5" strokeLinecap="round"/>
                <path d="M22 10C17 10 13 15 13 22" stroke="#818CF8" strokeWidth="2.5" strokeLinecap="round"/>
                <path d="M22 14C19 14 17 17 17 22v4" stroke="#C7D2FE" strokeWidth="2.5" strokeLinecap="round"/>
                <path d="M22 2C33 2 41 10 41 22" stroke="#3730A3" strokeWidth="2.5" strokeLinecap="round"/>
                <path d="M22 6C30 6 36 13 36 22" stroke="#4F46E5" strokeWidth="2.5" strokeLinecap="round"/>
                <path d="M22 10C27 10 31 15 31 22v6" stroke="#818CF8" strokeWidth="2.5" strokeLinecap="round"/>
                <circle cx="32" cy="35" r="9" fill="#818CF8"/>
                <polyline points="27,35 31,39 38,30" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </g>
              <text x="65" y="28" fontFamily="system-ui" fontWeight="800" fontSize="14" fill="white">Check</text>
              <text x="65" y="46" fontFamily="system-ui" fontWeight="800" fontSize="14" fill="#818CF8">Inn</text>
            </svg>
          </LogoCard>

          <LogoCard label="案7" dark>
            <svg viewBox="0 0 160 60" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="grad7d" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#A5B4FC"/>
                  <stop offset="100%" stopColor="#818CF8"/>
                </linearGradient>
              </defs>
              <rect width="160" height="60" fill="#1E1B4B"/>
              <circle cx="28" cy="30" r="20" fill="url(#grad7d)"/>
              <polyline points="18,30 25,38 38,21" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              <text x="58" y="26" fontFamily="system-ui" fontWeight="300" fontSize="11" fill="#6B7280" letterSpacing="2">CHECK</text>
              <text x="58" y="44" fontFamily="system-ui" fontWeight="900" fontSize="18" fill="white">Inn</text>
            </svg>
          </LogoCard>

          <LogoCard label="案8" dark>
            <svg viewBox="0 0 160 60" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="160" height="60" fill="#1E1B4B"/>
              <rect x="8" y="8" width="44" height="44" rx="10" fill="#818CF8"/>
              <text x="16" y="40" fontFamily="system-ui" fontWeight="900" fontSize="26" fill="white">CI</text>
              <text x="62" y="27" fontFamily="system-ui" fontWeight="300" fontSize="11" fill="#6B7280" letterSpacing="1">Check</text>
              <text x="62" y="44" fontFamily="system-ui" fontWeight="900" fontSize="16" fill="white">Inn</text>
            </svg>
          </LogoCard>

          <LogoCard label="案10" dark>
            <svg viewBox="0 0 160 60" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="160" height="60" fill="#1E1B4B"/>
              <text x="12" y="36" fontFamily="system-ui" fontWeight="300" fontSize="22" fill="#C7D2FE">Check</text>
              <text x="97" y="36" fontFamily="system-ui" fontWeight="900" fontSize="22" fill="white">Inn</text>
              <rect x="12" y="42" width="136" height="2.5" rx="1.25" fill="#818CF8" opacity="0.3"/>
              <rect x="12" y="42" width="60" height="2.5" rx="1.25" fill="#818CF8"/>
            </svg>
          </LogoCard>

        </div>
      </div>
    </div>
  )
}

function LogoCard({ label, desc, children, dark }: {
  label: string
  desc?: string
  children: React.ReactNode
  dark?: boolean
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`w-full rounded-xl overflow-hidden shadow-sm border ${dark ? 'border-indigo-900' : 'border-gray-200'}`}>
        {children}
      </div>
      <p className="text-xs font-bold text-gray-600">{label}</p>
      {desc && <p className="text-xs text-gray-400 text-center leading-tight">{desc}</p>}
    </div>
  )
}
