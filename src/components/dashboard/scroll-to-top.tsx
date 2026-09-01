'use client'

import { useState, useEffect } from 'react'
import { ArrowUp } from 'lucide-react'

// 少し下にスクロールすると現れる「一番上に戻る」ボタン
export function ScrollToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // ウィンドウ・内部スクロールコンテナ双方を捕捉（capture=true）
    const onScroll = (e: Event) => {
      let top = window.scrollY || document.documentElement.scrollTop || 0
      const target = e.target
      if (target instanceof HTMLElement) top = Math.max(top, target.scrollTop)
      setVisible(top > 300)
    }
    window.addEventListener('scroll', onScroll, true)
    return () => window.removeEventListener('scroll', onScroll, true)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (!visible) return null

  return (
    <button
      onClick={scrollToTop}
      aria-label="一番上に戻る"
      className="fixed bottom-6 right-4 sm:right-6 z-40 flex items-center justify-center w-11 h-11 rounded-full bg-navy-600 text-white shadow-lg shadow-navy-900/20 hover:bg-navy-700 active:scale-95 transition-all"
    >
      <ArrowUp size={20} />
    </button>
  )
}
