import { createServiceRoleClient } from '@/lib/supabase/server'

// 清掃担当者はアカウントを持つ人と持たない人が混在する。
// アカウントの有無は cleaning_staff.email を facility_members / facility_invitations と
// 突き合わせて判定する（cleaning_staff 側に状態を持たせない＝二重管理を避ける）。
export type AccountStatus = 'none' | 'invited' | 'active'

export type CleaningStaffRow = {
  id: string
  name: string
  email: string | null
  active: boolean
  created_at: string
}

export type CleaningStaffWithStatus = CleaningStaffRow & {
  account_status: AccountStatus
  facilities: string[]   // 招待中／参加中の施設名
}

export const CLEANING_STAFF_SELECT = 'id, name, email, active, created_at'

// 担当者ごとに「アカウント状態」と「対象施設名」を付与する
export async function withAccountStatus(
  staff: CleaningStaffRow[],
  ownerId: string
): Promise<CleaningStaffWithStatus[]> {
  const none = (s: CleaningStaffRow): CleaningStaffWithStatus =>
    ({ ...s, account_status: 'none', facilities: [] })

  const emails = staff.map(s => s.email?.toLowerCase()).filter((e): e is string => !!e)
  if (emails.length === 0) return staff.map(none)

  const service = createServiceRoleClient()

  // オーナーが持つ施設だけを対象にする
  const { data: facilities } = await service
    .from('facilities')
    .select('id, name')
    .eq('user_id', ownerId)

  const facilityNames = new Map((facilities ?? []).map(f => [f.id as string, f.name as string]))
  const facilityIds = [...facilityNames.keys()]
  if (facilityIds.length === 0) return staff.map(none)

  // 参加済みメンバー：user_id からメールアドレスを引く必要がある
  const { data: members } = await service
    .from('facility_members')
    .select('facility_id, user_id')
    .in('facility_id', facilityIds)

  const activeByEmail = new Map<string, string[]>()
  for (const m of members ?? []) {
    const { data: { user: memberUser } } = await service.auth.admin.getUserById(m.user_id)
    const email = memberUser?.email?.toLowerCase()
    if (!email || !emails.includes(email)) continue
    const list = activeByEmail.get(email) ?? []
    list.push(facilityNames.get(m.facility_id) ?? '')
    activeByEmail.set(email, list)
  }

  // 招待中（未承認かつ有効期限内）
  const { data: invitations } = await service
    .from('facility_invitations')
    .select('facility_id, invited_email')
    .in('facility_id', facilityIds)
    .in('invited_email', emails)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())

  const invitedByEmail = new Map<string, string[]>()
  for (const inv of invitations ?? []) {
    const email = (inv.invited_email as string).toLowerCase()
    const list = invitedByEmail.get(email) ?? []
    list.push(facilityNames.get(inv.facility_id) ?? '')
    invitedByEmail.set(email, list)
  }

  return staff.map(s => {
    const email = s.email?.toLowerCase()
    if (!email) return none(s)
    const active = activeByEmail.get(email)
    if (active?.length) return { ...s, account_status: 'active' as const, facilities: active }
    const invited = invitedByEmail.get(email)
    if (invited?.length) return { ...s, account_status: 'invited' as const, facilities: invited }
    return none(s)
  })
}
