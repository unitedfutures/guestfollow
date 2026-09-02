'use client'

import { createContext, useContext, useSyncExternalStore, ReactNode } from 'react'
import { Globe } from 'lucide-react'
import { GUEST_LANGS, GuestLang, detectGuestLang, guestT } from './guest'

type Ctx = {
  lang: GuestLang
  setLang: (l: GuestLang) => void
  t: (key: string, vars?: Record<string, string | number>) => string
}

const GuestLangContext = createContext<Ctx | null>(null)

// 表示言語は localStorage / ブラウザ設定という「React外の状態」なので
// useSyncExternalStore で購読する（effect で setState するとレンダリングが連鎖する）
const STORAGE_KEY = 'checkinn-guest-lang'
const listeners = new Set<() => void>()
// localStorage が使えないブラウザ（プライベートモード等）でも切替が効くよう、
// この画面で選ばれた言語はメモリにも保持する
let selected: GuestLang | null = null

function subscribe(onChange: () => void) {
  listeners.add(onChange)
  // 別タブで言語を変えた場合にも追従する
  window.addEventListener('storage', onChange)
  return () => {
    listeners.delete(onChange)
    window.removeEventListener('storage', onChange)
  }
}

function getSnapshot(): GuestLang {
  if (selected) return selected
  try {
    return detectGuestLang()
  } catch {
    return 'ja'
  }
}

// サーバー描画時は常に日本語（クライアントで検出結果に切り替わる）
function getServerSnapshot(): GuestLang {
  return 'ja'
}

export function GuestLangProvider({ children }: { children: ReactNode }) {
  const lang = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const setLang = (l: GuestLang) => {
    selected = l
    try { window.localStorage.setItem(STORAGE_KEY, l) } catch { /* noop */ }
    listeners.forEach(fn => fn())
  }

  const t = (key: string, vars?: Record<string, string | number>) => guestT(lang, key, vars)

  return (
    <GuestLangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </GuestLangContext.Provider>
  )
}

export function useGuestLang(): Ctx {
  const ctx = useContext(GuestLangContext)
  if (!ctx) throw new Error('useGuestLang must be used within GuestLangProvider')
  return ctx
}

export function LanguageSwitcher({ dark = false }: { dark?: boolean }) {
  const { lang, setLang } = useGuestLang()
  return (
    <div className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 ${
      dark ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-white'
    }`}>
      <Globe size={13} className={dark ? 'text-gray-400' : 'text-gray-400'} />
      <select
        value={lang}
        onChange={e => setLang(e.target.value as GuestLang)}
        className={`text-xs bg-transparent focus:outline-none cursor-pointer ${
          dark ? 'text-gray-200' : 'text-gray-600'
        }`}
        aria-label="Language"
      >
        {GUEST_LANGS.map(l => (
          <option key={l.code} value={l.code} className="text-gray-900">{l.label}</option>
        ))}
      </select>
    </div>
  )
}

// ゲストページ共通ヘッダー（GuestFollowロゴ + 翻訳サブタイトル + 言語切替）
export function GuestHeader({ subtitleKey }: { subtitleKey: string }) {
  const { t } = useGuestLang()
  return (
    <div className="mb-6">
      <div className="flex justify-end mb-3">
        <LanguageSwitcher />
      </div>
      <div className="text-center">
        <h1 className="text-2xl font-bold text-indigo-600 tracking-wide">GuestFollow</h1>
        <p className="text-gray-500 text-sm mt-1">{t(subtitleKey)}</p>
      </div>
    </div>
  )
}

// 翻訳テキストを1つ描画するだけの軽量コンポーネント（サーバーページ内で使用）
export function GuestText({ k, className }: { k: string; className?: string }) {
  const { t } = useGuestLang()
  return <span className={className}>{t(k)}</span>
}
