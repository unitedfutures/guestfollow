import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getAccountAccess } from '@/lib/auth/roles'
import { MinpakuReportClient } from './minpaku-report-client'

export default async function MinpakuReportPage() {
  const { isCleanerOnly } = await getAccountAccess()
  if (isCleanerOnly) redirect('/dashboard')

  const supabase = await createClient()

  // 直近2年分の予約を対象（キャンセルは集計側で除外）
  const since = new Date(new Date().setFullYear(new Date().getFullYear() - 2)).toISOString().split('T')[0]

  const [{ data: facilities }, { data: rawBookings }] = await Promise.all([
    supabase.from('facilities').select('id, name').order('name'),
    supabase
      .from('bookings')
      .select('id, facility_id, guest_name, checkin_date, checkout_date, num_guests, ota_status, ota_channel, guest_country')
      .gte('checkout_date', since),
  ])

  const bookingIds = (rawBookings ?? []).map(b => b.id)
  // 国籍内訳用に宿泊者名簿から国籍を取得（登録済みの予約のみ）
  let guestRecords: { booking_id: string; nationality: string | null; is_foreign: boolean | null }[] = []
  if (bookingIds.length) {
    const { data: gr } = await supabase
      .from('guest_records')
      .select('booking_id, nationality, is_foreign')
      .in('booking_id', bookingIds)
    guestRecords = gr ?? []
  }

  return (
    <MinpakuReportClient
      facilities={facilities ?? []}
      bookings={rawBookings ?? []}
      guestRecords={guestRecords}
    />
  )
}
