import { createClient } from '@/lib/supabase/server'

export type AccountAccess = {
  hasAny: boolean          // 何らかの施設に関与しているか
  isCleanerOnly: boolean   // 全ての関与が清掃担当者のみ（オーナー/現場管理責任者ではない）
}

// ログインユーザーのアカウント全体のアクセス区分を判定する
export async function getAccountAccess(): Promise<AccountAccess> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { hasAny: false, isCleanerOnly: false }

  const [{ count: ownedCount }, { data: members }] = await Promise.all([
    supabase.from('facilities').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('facility_members').select('role').eq('user_id', user.id),
  ])

  const owns = (ownedCount ?? 0) > 0
  const roles = (members ?? []).map(m => m.role as string)
  const managesAny = roles.includes('manager')
  const cleanerAny = roles.includes('cleaner')

  return {
    hasAny: owns || roles.length > 0,
    isCleanerOnly: !owns && !managesAny && cleanerAny,
  }
}
