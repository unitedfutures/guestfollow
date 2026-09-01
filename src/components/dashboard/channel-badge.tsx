// 予約元OTA（Airbnb / Booking.com / Expedia / 直接予約 など）のバッジ
// ota_source（Beds24/Airhost = サイトコントローラー）とは別物

const CHANNEL_STYLES: { match: RegExp; label: string; className: string }[] = [
  { match: /airbnb/i,                 label: 'Airbnb',       className: 'text-rose-700 bg-rose-50 border-rose-200' },
  { match: /booking/i,                label: 'Booking.com',  className: 'text-blue-700 bg-blue-50 border-blue-200' },
  { match: /expedia/i,                label: 'Expedia',      className: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
  { match: /agoda/i,                  label: 'Agoda',        className: 'text-red-700 bg-red-50 border-red-200' },
  { match: /rakuten|楽天/i,            label: '楽天トラベル',   className: 'text-red-700 bg-red-50 border-red-200' },
  { match: /jalan|じゃらん/i,          label: 'じゃらん',       className: 'text-orange-700 bg-orange-50 border-orange-200' },
  { match: /vrbo|homeaway/i,          label: 'Vrbo',         className: 'text-teal-700 bg-teal-50 border-teal-200' },
  { match: /direct|直接|website|自社/i, label: '直接予約',      className: 'text-gray-600 bg-gray-50 border-gray-200' },
]

export function ChannelBadge({ channel }: { channel: string | null }) {
  if (!channel) return null
  const hit = CHANNEL_STYLES.find(s => s.match.test(channel))
  const label = hit?.label ?? channel
  const className = hit?.className ?? 'text-indigo-700 bg-indigo-50 border-indigo-200'
  return (
    <span className={`text-[10px] font-bold border rounded px-1.5 py-0.5 shrink-0 ${className}`}>
      {label}
    </span>
  )
}
