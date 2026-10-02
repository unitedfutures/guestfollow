import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAccountAccess } from '@/lib/auth/roles'
import { ManagementDashboard, DashboardEmpty } from './management-dashboard'
import { aggregateByMonth, jstToday, monthRange, type BookingRow } from '@/lib/analytics/kpi'
import { selectBookingsForRevenue } from '@/lib/analytics/select-bookings'

// ログイン後のトップページ。経営数値（売上・稼働率・ADRなど）をまとめて表示する。
export default async function DashboardPage() {
  const { isCleanerOnly } = await getAccountAccess()
  // 清掃担当者は経営数値を見せず、これまでどおり清掃予定の画面へ
  if (isCleanerOnly) redirect('/dashboard/bookings')

  const supabase = await createClient()
  const [{ data: facilities }, bookings] = await Promise.all([
    supabase.from('facilities').select('id, name').order('name'),
    selectBookingsForRevenue<BookingRow>(
      supabase,
      'facility_id, checkin_date, checkout_date, num_guests, price, commission, ota_status',
    ),
  ])

  if (!facilities?.length) return <DashboardEmpty />

  const currentMonth = jstToday().slice(0, 7)
  const pastMonths = monthRange(currentMonth, -11, 12)   // 実績（当月を含む直近12ヶ月）
  const futureMonths = monthRange(currentMonth, 1, 6)    // オンハンド（翌月から6ヶ月）
  const months = [...pastMonths, ...futureMonths]
  const rows = bookings

  // 集計期間に予約が1件も無い施設は、稼働率の分母から外す（開業前・停止中の施設を含めないため）
  const active = facilities.filter(f =>
    rows.some(b =>
      b.facility_id === f.id &&
      b.ota_status !== 'cancelled' &&
      b.checkout_date >= `${months[0]}-01` &&
      b.checkout_date <= `${months[months.length - 1]}-31`
    )
  )
  const target = active.length > 0 ? active : facilities

  const monthly = aggregateByMonth(rows, months, target.map(f => f.id))

  return (
    <ManagementDashboard
      facilities={target}
      past={monthly.slice(0, pastMonths.length)}
      future={monthly.slice(pastMonths.length)}
      currentMonth={currentMonth}
      excludedFacilityCount={facilities.length - target.length}
    />
  )
}
