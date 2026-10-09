import { createClient } from '@/lib/supabase/server'
import { BookingDashboard } from './booking-dashboard'
import { getAccountAccess } from '@/lib/auth/roles'
import { selectBookingsWithOptional } from '@/lib/analytics/select-bookings'
import { isMissingColumn } from '@/lib/beds24/sync-write'

export default async function DashboardPage() {
  const { isCleanerOnly } = await getAccountAccess()
  const supabase = await createClient()

  // 個別URL（/survey/b/[BOOKID]）から回答されたアンケートは予約に紐づく
  const { data: surveyLinks, error: surveyLinkError } = await supabase
    .from('survey_responses').select('booking_id, created_at').not('booking_id', 'is', null)
  const answeredBookingIds = isMissingColumn(surveyLinkError, 'booking_id')
    ? []
    : (surveyLinks ?? []).map(s => s.booking_id as string)

  const [
    rawBookings,
    { data: facilities },
    { data: cleaningStaff },
  ] = await Promise.all([
    selectBookingsWithOptional<Record<string, unknown>>(
      supabase,
      `id, guest_name, guest_email, checkin_date, checkout_date,
       num_guests, status, ota_source, ota_channel, ota_status, cleaning_staff_id,
       created_at, facility_id, pre_checkin_token, beds24_booking_id, price,
       facilities(id, name),
       guest_records(
         id, full_name, email, phone, address, num_guests,
         is_foreign, nationality, checkin_completed_at, terms_agreed_at
       )`,
      ['guest_phone', 'ota_comments', 'ota_notes', 'invoice_total'],
      q => q.order('checkin_date', { ascending: false }),
    ),
    supabase
      .from('facilities')
      .select('id, name')
      .order('name'),
    supabase
      .from('cleaning_staff')
      .select('id, name')
      .eq('active', true)
      .order('created_at', { ascending: true }),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bookings = rawBookings as any[]

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  return (
    <BookingDashboard
      bookings={bookings}
      facilities={facilities ?? []}
      cleaningStaff={cleaningStaff ?? []}
      appUrl={appUrl}
      answeredBookingIds={answeredBookingIds}
      cleanerMode={isCleanerOnly}
    />
  )
}
