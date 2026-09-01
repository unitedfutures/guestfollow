import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getAccountAccess } from '@/lib/auth/roles'
import { PricingClient } from './pricing-client'

export default async function PricingPage() {
  const { isCleanerOnly } = await getAccountAccess()
  if (isCleanerOnly) redirect('/dashboard')

  const supabase = await createClient()
  const [{ data: facilities }, { data: accs }] = await Promise.all([
    supabase
      .from('facilities')
      .select('id, name, beds24_property_id, ota_account_id, pricing_rules')
      .order('name'),
    supabase.from('ota_accounts').select('id, refresh_token'),
  ])

  // Refresh Token（書き込み可）が設定済みのアカウント
  const refreshAccountIds = new Set((accs ?? []).filter(a => a.refresh_token).map(a => a.id))

  // Beds24連携済みの施設のみ対象。反映可否（Refresh Token有無）も付与
  const beds24Facilities = (facilities ?? [])
    .filter(f => f.beds24_property_id)
    .map(f => ({
      id: f.id,
      name: f.name,
      beds24_property_id: f.beds24_property_id,
      pricing_rules: f.pricing_rules,
      has_refresh: !!(f.ota_account_id && refreshAccountIds.has(f.ota_account_id)),
    }))

  return <PricingClient facilities={beds24Facilities} />
}
