import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * 施設に対して「オーナー」または「現場管理責任者(manager)」の権限を持つか。
 * cleaner ロールは false。RLS だけに頼らず、書き込み系APIで明示的に呼ぶこと。
 */
export async function canManage(supabase: SupabaseClient, facilityId: string, userId: string): Promise<boolean> {
  if (!facilityId || !userId) return false
  const { data: facility } = await supabase
    .from('facilities')
    .select('user_id')
    .eq('id', facilityId)
    .maybeSingle()
  if (facility?.user_id === userId) return true

  const { data: member } = await supabase
    .from('facility_members')
    .select('role')
    .eq('facility_id', facilityId)
    .eq('user_id', userId)
    .maybeSingle()
  return member?.role === 'manager'
}
