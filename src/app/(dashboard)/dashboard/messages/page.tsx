import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MessagesClient } from './messages-client'
import { getAccountAccess } from '@/lib/auth/roles'

export default async function MessagesPage() {
  const { isCleanerOnly } = await getAccountAccess()
  if (isCleanerOnly) redirect('/dashboard')

  const supabase = await createClient()

  const [{ data: rawMessages }, { data: bookings }, { data: facs }, { data: accs }] = await Promise.all([
    supabase
      .from('messages')
      .select('id, booking_id, facility_id, ota_source, direction, source, body, sent_at, read')
      .order('sent_at', { ascending: false }),
    supabase
      .from('bookings')
      .select('id, guest_name, guest_email, checkin_date, checkout_date, ota_source, ota_channel, facility_id, facilities(name)')
      .order('checkin_date', { ascending: false }),
    supabase.from('facilities').select('id, ota_account_id'),
    supabase.from('ota_accounts').select('id, refresh_token'),
  ])

  // Refresh Token（書き込み可）が設定済みのアカウントに紐づく施設ID
  const refreshAccountIds = new Set((accs ?? []).filter(a => a.refresh_token).map(a => a.id))
  const refreshFacilityIds = (facs ?? [])
    .filter(f => f.ota_account_id && refreshAccountIds.has(f.ota_account_id))
    .map(f => f.id)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const messages = (rawMessages ?? []) as any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bookingList = (bookings ?? []) as any[]

  return <MessagesClient initialMessages={messages} bookings={bookingList} refreshFacilityIds={refreshFacilityIds} />
}
