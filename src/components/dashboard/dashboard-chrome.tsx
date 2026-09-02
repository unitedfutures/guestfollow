'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Building2, Settings, LogOut, LayoutDashboard, ClipboardList, MessageSquare,
  TrendingUp, Menu, X, ClipboardCheck, Coins, Tag,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/logo'
import { ScrollToTop } from '@/components/dashboard/scroll-to-top'

const navItems = [
  { href: '/dashboard', label: '予約一覧', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/messages', label: 'メッセージ', icon: MessageSquare },
  { href: '/dashboard/pricing', label: '宿泊価格', icon: Tag },
  { href: '/dashboard/facilities', label: '施設管理', icon: Building2 },
  { href: '/dashboard/surveys', label: 'アンケート結果', icon: ClipboardList },
  { href: '/dashboard/reports', label: '売上レポート', icon: TrendingUp },
  { href: '/dashboard/minpaku-report', label: '宿泊実績報告', icon: ClipboardCheck },
  { href: '/dashboard/accommodation-tax', label: '宿泊税計算', icon: Coins },
  { href: '/dashboard/settings', label: '設定', icon: Settings },
]

const cleanerNavItems = [
  { href: '/dashboard', label: '清掃予定', icon: LayoutDashboard, exact: true },
]

export function DashboardChrome({
  cleanerOnly = false,
  children,
}: {
  cleanerOnly?: boolean
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  const items = cleanerOnly ? cleanerNavItems : navItems

  // ルート変更時にモバイルドロワーを閉じる
  useEffect(() => { setMobileOpen(false) }, [pathname])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const navBody = (
    <>
      <div className="px-6 py-5 border-b border-navy-600 flex items-center justify-between">
        <div>
          <Logo variant="default" size="sm" />
          <p className="text-xs text-navy-100 mt-0.5">{cleanerOnly ? '清掃担当者' : '管理ダッシュボード'}</p>
        </div>
        {/* モバイルの閉じるボタン */}
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden text-navy-100 hover:text-white p-1"
          aria-label="メニューを閉じる"
        >
          <X size={20} />
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {items.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-navy-500 text-white'
                  : 'text-navy-100 hover:bg-navy-600 hover:text-white'
              )}
            >
              <Icon size={18} />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="px-3 py-4 border-t border-navy-600">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-navy-100 hover:bg-navy-600 hover:text-white transition-colors"
        >
          <LogOut size={18} />
          ログアウト
        </button>
      </div>
    </>
  )

  return (
    <div className="lg:flex min-h-screen bg-gray-50">

      {/* ── モバイル用トップバー ── */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center gap-3 bg-navy-700 h-14 px-4">
        <button
          onClick={() => setMobileOpen(true)}
          className="text-white p-1 -ml-1"
          aria-label="メニューを開く"
        >
          <Menu size={22} />
        </button>
        <Logo variant="default" size="sm" />
      </header>

      {/* ── デスクトップ固定サイドバー ── */}
      <aside className="hidden lg:flex w-60 min-h-screen bg-navy-700 flex-col shrink-0">
        {navBody}
      </aside>

      {/* ── モバイルドロワー ── */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-64 max-w-[80%] bg-navy-700 flex flex-col shadow-2xl">
            {navBody}
          </aside>
        </div>
      )}

      {/* ── メインコンテンツ ── */}
      <main className="flex-1 min-w-0 overflow-auto">
        {children}
      </main>

      {/* 一番上に戻るボタン */}
      <ScrollToTop />
    </div>
  )
}
