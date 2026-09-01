import { createServiceRoleClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { InviteAccept } from './invite-accept'

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const serviceSupabase = createServiceRoleClient()

  // 招待レコードを取得
  const { data: invitation } = await serviceSupabase
    .from('facility_invitations')
    .select('id, facility_id, invited_email, expires_at, accepted_at, facilities(name, address)')
    .eq('token', token)
    .single()

  if (!invitation) notFound()

  // 現在のユーザー確認
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const isExpired = new Date(invitation.expires_at) < new Date()
  const isAccepted = !!invitation.accepted_at
  const facilityData = Array.isArray(invitation.facilities)
    ? (invitation.facilities[0] as { name: string; address: string | null } | undefined)
    : (invitation.facilities as unknown as { name: string; address: string | null } | null)
  const facilityName = facilityData?.name ?? ''
  const facilityAddress = facilityData?.address ?? null

  return (
    <InviteAccept
      token={token}
      facilityName={facilityName}
      facilityAddress={facilityAddress}
      invitedEmail={invitation.invited_email}
      isExpired={isExpired}
      isAccepted={isAccepted}
      isLoggedIn={!!user}
      currentUserEmail={user?.email ?? null}
    />
  )
}
