import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Lock, Building2 } from 'lucide-react'
import { redirect } from 'next/navigation'
import { SettingsForm } from './settings-form'
import { OtaAccountsManager } from './ota-accounts-manager'
import { CleaningStaffManager } from './cleaning-staff-manager'
import { getAccountAccess } from '@/lib/auth/roles'

export default async function SettingsPage() {
  const { isCleanerOnly } = await getAccountAccess()
  if (isCleanerOnly) redirect('/dashboard')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: profile }, { data: otaAccounts }, { data: cleaningStaff }] = await Promise.all([
    supabase
      .from('profiles')
      .select('company_name')
      .eq('id', user!.id)
      .single(),
    supabase
      .from('ota_accounts')
      .select('id, provider, label, created_at, api_key, refresh_token')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: true }),
    supabase
      .from('cleaning_staff')
      .select('id, name, active, created_at')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: true }),
  ])

  // 既存ユーザー救済：profiles.company_name が空でも、サインアップ時に入力した
  // 会社名（auth メタデータ）が残っていれば profiles に補完して表示する。
  let companyName = profile?.company_name ?? ''
  const metaCompanyName = (user?.user_metadata?.company_name as string | undefined)?.trim()
  if (!companyName && metaCompanyName) {
    await supabase
      .from('profiles')
      .update({ company_name: metaCompanyName, updated_at: new Date().toISOString() })
      .eq('id', user!.id)
    companyName = metaCompanyName
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">設定</h2>
        <p className="text-gray-500 text-sm mt-1">アカウント・連携サービスの設定</p>
      </div>

      <div className="space-y-6">
        <SettingsForm
          defaultCompanyName={companyName}
          email={user?.email ?? ''}
        />

        <OtaAccountsManager
          initialAccounts={(otaAccounts ?? []).map(a => ({
            id: a.id,
            provider: a.provider,
            label: a.label,
            created_at: a.created_at,
            has_longlife: !!a.api_key,
            has_refresh: !!a.refresh_token,
          }))}
        />

        <CleaningStaffManager initialStaff={cleaningStaff ?? []} />

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 size={18} className="text-gray-500" />
              <h3 className="font-semibold text-gray-900">RemoteLOCK</h3>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-1">スマートロック連動の設定は施設ごとに行います。</p>
            <p className="text-xs text-gray-400">施設管理 → 各施設の「RemoteLOCK Device ID」欄に入力してください。</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock size={18} className="text-gray-500" />
              <h3 className="font-semibold text-gray-900">データ保存・削除ポリシー</h3>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-gray-600 space-y-2">
              <li className="flex gap-2"><span className="text-green-500">✓</span> 宿泊者名簿：旅館業法に基づき3年間保存後、自動削除</li>
              <li className="flex gap-2"><span className="text-green-500">✓</span> 顔写真・パスポート画像：暗号化してSupabase Storageに保存</li>
              <li className="flex gap-2"><span className="text-green-500">✓</span> 通信：HTTPS必須（Vercel自動対応）</li>
              <li className="flex gap-2"><span className="text-green-500">✓</span> 規約同意：タイムスタンプ・IPアドレスを記録</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
