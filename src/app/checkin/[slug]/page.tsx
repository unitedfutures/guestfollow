import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { CheckinFlow } from './checkin-flow'
import { GuestLangProvider } from '@/lib/i18n/guest-lang'

export default async function FacilityCheckinPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: facility } = await supabase
    .from('facilities')
    .select('id, name, address, checkin_instructions, emergency_contact, camera_checkin')
    .eq('qr_slug', slug)
    .single()

  if (!facility) notFound()

  return (
    <GuestLangProvider>
      <CheckinFlow facility={facility} />
    </GuestLangProvider>
  )
}
