import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getAccountAccess } from '@/lib/auth/roles'
import { ReportsClient } from './reports-client'

export default async function ReportsPage() {
  const { isCleanerOnly } = await getAccountAccess()
  if (isCleanerOnly) redirect('/dashboard')

  const supabase = await createClient()

  const [{ data: rawBookings }, { data: facilities }] = await Promise.all([
    supabase
      .from('bookings')
      .select('id, guest_name, checkin_date, checkout_date, num_guests, ota_source, ota_channel, ota_status, price, commission, facility_id, facilities(name)')
      .order('checkin_date', { ascending: false }),
    supabase
      .from('facilities')
      .select('id, name')
      .order('name'),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bookings = (rawBookings ?? []) as any[]

  return <ReportsClient bookings={bookings} facilities={facilities ?? []} />
}
