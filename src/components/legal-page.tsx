import Link from 'next/link'
import { Logo } from '@/components/logo'

// 利用規約・プライバシーポリシー・特定商取引法の表記で共通の枠と見出し

export function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
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

      <main className="max-w-4xl mx-auto px-6 py-16">{children}</main>

      <footer className="border-t border-gray-100 py-8 px-6 text-center">
        <p className="text-xs text-gray-400">
          <a href="https://united-futures.com/" target="_blank" rel="noopener noreferrer" className="hover:text-gray-600 transition-colors">© 2026 UNITED FUTURES, INC.</a>
        </p>
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-3 text-xs text-gray-400">
          <Link href="/terms" className="hover:text-navy-500 transition-colors">利用規約</Link>
          <Link href="/privacy" className="hover:text-navy-500 transition-colors">プライバシーポリシー</Link>
          <Link href="/tokusho" className="hover:text-navy-500 transition-colors">特定商取引法に基づく表記</Link>
        </div>
      </footer>
    </div>
  )
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-base font-bold text-navy-700 border-l-4 border-gold-400 pl-3 mb-4">{title}</h2>
      <div className="text-sm text-gray-700 leading-relaxed space-y-3 pl-1">{children}</div>
    </section>
  )
}

export function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <h3 className="text-sm font-semibold text-gray-800 mb-2">{title}</h3>
      <div className="pl-3">{children}</div>
    </div>
  )
}

export function Table({ rows, headers }: { rows: string[][]; headers?: string[] }) {
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

// 番号付きの条項（(1)(2)… の形で並べる）
export function Items({ items }: { items: React.ReactNode[] }) {
  return (
    <ol className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2">
          <span className="shrink-0 text-gray-500">（{i + 1}）</span>
          <span>{item}</span>
        </li>
      ))}
    </ol>
  )
}
