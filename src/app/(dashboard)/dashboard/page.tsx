import { createClient } from '@/lib/supabase/server'
import { BookingDashboard } from './booking-dashboard'
import { getAccountAccess } from '@/lib/auth/roles'

export default async function DashboardPage() {
  const { isCleanerOnly } = await getAccountAccess()
  const supabase = await createClient()

  const [
    { data: rawBookings },
    { data: facilities },
    { data: surveyResponses },
    { data: cleaningStaff },
  ] = await Promise.all([
    supabase
      .from('bookings')
      .select(`
        id, guest_name, guest_email, checkin_date, checkout_date,
        num_guests, status, ota_source, ota_channel, ota_status, cleaning_staff_id,
        created_at, facility_id, pre_checkin_token,
        facilities(id, name),
        guest_records(
          id, full_name, email, phone, address, num_guests,
          is_foreign, nationality, checkin_completed_at, terms_agreed_at
        )
      `)
      .order('checkin_date', { ascending: false }),
    supabase
      .from('facilities')
      .select('id, name')
      .order('name'),
    supabase
      .from('survey_responses')
      .select('id, facility_id, stay_checkin'),
    supabase
      .from('cleaning_staff')
      .select('id, name')
      .eq('active', true)
      .order('created_at', { ascending: true }),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bookings = (rawBookings ?? []) as any[]

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  return (
    <BookingDashboard
      bookings={bookings}
      facilities={facilities ?? []}
      surveyResponses={surveyResponses ?? []}
      cleaningStaff={cleaningStaff ?? []}
      appUrl={appUrl}
      cleanerMode={isCleanerOnly}
    />
  )
}
