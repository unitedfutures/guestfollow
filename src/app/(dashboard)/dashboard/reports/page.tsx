import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getAccountAccess } from '@/lib/auth/roles'
import { ReportsClient } from './reports-client'
import { selectBookingsForRevenue } from '@/lib/analytics/select-bookings'

export default async function ReportsPage() {
  const { isCleanerOnly } = await getAccountAccess()
  if (isCleanerOnly) redirect('/dashboard')

  const supabase = await createClient()

  const [rawBookings, { data: facilities }] = await Promise.all([
    selectBookingsForRevenue<Record<string, unknown>>(
      supabase,
      'id, guest_name, checkin_date, checkout_date, num_guests, ota_source, ota_channel, ota_status, price, commission, facility_id, facilities(name)',
    ),
    supabase
      .from('facilities')
      .select('id, name')
      .order('name'),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bookings = rawBookings as any[]

  return <ReportsClient bookings={bookings} facilities={facilities ?? []} />
}
