// 予約・メッセージの取得元（サイトコントローラー）を示すバッジ。
// 予約一覧・売上レポートでは連携なしを「手動」と表示し、
// メッセージ画面では表示しない（showManual=false）。
export function OtaBadge({ source, showManual = true }: { source: string | null; showManual?: boolean }) {
  if (source === 'beds24') {
    return <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5">Beds24</span>
  }
  if (source === 'airhost') {
    return <span className="text-[10px] font-bold text-purple-600 bg-purple-50 border border-purple-200 rounded px-1.5 py-0.5">Airhost</span>
  }
  if (!showManual) return null
  return <span className="text-[10px] font-bold text-gray-400 bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5">手動</span>
}
