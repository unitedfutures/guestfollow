import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getAccountAccess } from '@/lib/auth/roles'
import { AccommodationTaxClient } from './accommodation-tax-client'

export default async function AccommodationTaxPage() {
  const { isCleanerOnly } = await getAccountAccess()
  if (isCleanerOnly) redirect('/dashboard')

  const supabase = await createClient()
  const since = new Date(new Date().setFullYear(new Date().getFullYear() - 2)).toISOString().split('T')[0]

  const [{ data: facilities }, { data: bookings }] = await Promise.all([
    supabase.from('facilities').select('id, name, accommodation_tax').order('name'),
    supabase
      .from('bookings')
      .select('id, facility_id, checkin_date, checkout_date, num_guests, ota_status, price, room_charge')
      .gte('checkout_date', since),
  ])

  return <AccommodationTaxClient facilities={facilities ?? []} bookings={bookings ?? []} />
}
