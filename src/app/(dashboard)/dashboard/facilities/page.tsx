import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Building2, Users } from 'lucide-react'
import { FacilityForm } from './facility-form'
import { OtaImportButton } from './ota-import-button'
import { FormConfigEditor, DEFAULT_FORM_CONFIG } from './form-config-editor'
import { FacilityBasicInfo } from './facility-basic-info'
import { FacilityTaxConfig } from './facility-tax-config'
import { SurveyConfigEditor, DEFAULT_SURVEY_CONFIG } from '../surveys/survey-config-editor'
import { FacilityMembersManager } from './facility-members-manager'
import { FacilityMemoEditor } from './facility-memo-editor'
import { FacilityDeleteButton } from './facility-delete-button'
import { FacilityDisconnectButton } from './facility-disconnect-button'
import type { FormConfig } from './form-config-editor'
import type { SurveyConfig } from '@/app/survey/[qr_slug]/survey-form'

export default async function FacilitiesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // OTA連携アカウント一覧
  const { data: otaAccounts } = await supabase
    .from('ota_accounts')
    .select('id, provider, label')
    .eq('user_id', user?.id ?? '')
    .order('created_at', { ascending: true })

  // オーナーとして管理する施設
  const { data: ownedFacilities } = await supabase
    .from('facilities')
    .select('*, bookings(count), survey_config')
    .eq('user_id', user?.id ?? '')
    .order('created_at', { ascending: false })

  // メンバーとして参加している施設（ロール付き）
  const { data: memberLinks } = await supabase
    .from('facility_members')
    .select('facility_id, role, facilities(*, bookings(count), survey_config)')
    .eq('user_id', user?.id ?? '')

  const memberFacilities = (memberLinks ?? [])
    .filter(m => m.facilities)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map(m => ({ ...(m.facilities as any), _role: m.role as string }))

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const allFacilities = [
    ...(ownedFacilities ?? []).map(f => ({ ...f, _isOwner: true, _role: 'owner' })),
    ...(memberFacilities ?? []).map(f => ({ ...f, _isOwner: false })),
  ]

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">施設管理</h2>
          <p className="text-gray-500 text-sm mt-1">施設の登録・事前登録URL発行・QRコード・サイトコントローラー連携（Beds24 / Airhost）</p>
        </div>
        <div className="flex items-start gap-3">
          <OtaImportButton accounts={otaAccounts ?? []} />
          <FacilityForm />
        </div>
      </div>

      {allFacilities.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {allFacilities.map((f) => {
            const isOwner = f._isOwner
            const role = (f._role as string) ?? (isOwner ? 'owner' : 'manager')
            const canManage = role === 'owner' || role === 'manager'
            const formConfig: FormConfig = { ...DEFAULT_FORM_CONFIG, ...(f.form_config as Partial<FormConfig> ?? {}) }
            const surveyConfig: SurveyConfig = {
              ...DEFAULT_SURVEY_CONFIG,
              ...(f.survey_config as Partial<SurveyConfig> ?? {}),
              standard: { ...DEFAULT_SURVEY_CONFIG.standard, ...((f.survey_config as Partial<SurveyConfig>)?.standard ?? {}) },
            }
            return (
              <Card key={f.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Building2 size={18} className="text-indigo-600" />
                        <h3 className="font-semibold text-gray-900">{f.name}</h3>
                        {!isOwner && (
                          <span className="inline-flex items-center gap-1 text-xs text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded-full">
                            <Users size={10} /> 共有
                          </span>
                        )}
                      </div>
                      {f.address && <p className="text-xs text-gray-400 mt-0.5 ml-6">{f.address}</p>}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      <Badge variant="info">
                        {(f.bookings as unknown as { count: number }[])?.[0]?.count ?? 0}件
                      </Badge>
                      {isOwner && (f.beds24_property_id || f.airhost_property_id) && (
                        <FacilityDisconnectButton facilityId={f.id} facilityName={f.name} />
                      )}
                      {isOwner && (
                        <FacilityDeleteButton facilityId={f.id} facilityName={f.name} />
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">

                  {canManage && (
                    <>
                      {/* ① 基本情報（事前登録URL・チェックインQR） */}
                      <FacilityBasicInfo facility={f} appUrl={appUrl} />

                      {/* ② 宿泊者名簿設定（最大人数 + フォーム項目） */}
                      <FormConfigEditor
                        facilityId={f.id}
                        currentConfig={formConfig}
                        currentMaxGuests={f.max_guests ?? 10}
                      />

                      {/* ③ アンケート設定（URL + 設問） */}
                      <SurveyConfigEditor
                        facilityId={f.id}
                        currentConfig={surveyConfig}
                        qrSlug={f.qr_slug}
                        appUrl={appUrl}
                      />

                      {/* ④ 宿泊税の設定 */}
                      <FacilityTaxConfig facilityId={f.id} initial={f.accommodation_tax ?? null} />
                    </>
                  )}

                  {/* ④ メンバー管理（オーナー/現場管理責任者は招待可・その他はロール表示） */}
                  <FacilityMembersManager facilityId={f.id} canManage={canManage} myRole={role} />

                  {/* ⑤ 施設メモ（オーナー/現場管理責任者） */}
                  {canManage && (
                    <FacilityMemoEditor facilityId={f.id} initialMemo={f.memo ?? ''} />
                  )}

                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-16 text-gray-400">
          <Building2 size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-sm">施設が登録されていません</p>
          <p className="text-xs mt-1">「施設を追加」ボタンから登録してください（Beds24連携の場合はインポートも可）</p>
        </div>
      )}

    </div>
  )
}
