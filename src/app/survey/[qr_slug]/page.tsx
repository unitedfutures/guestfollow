import { createServiceRoleClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { SurveyForm } from './survey-form'
import type { SurveyConfig } from './survey-form'
import { mergeSurveyConfig } from '@/lib/survey/config'
import { GuestLangProvider, GuestHeader, GuestText } from '@/lib/i18n/guest-lang'

export default async function SurveyPage({ params }: { params: Promise<{ qr_slug: string }> }) {
  const { qr_slug } = await params
  // 公開ページ：秘密の qr_slug で絞った1件のみ service role で読む
  const supabase = createServiceRoleClient()

  const { data: facility } = await supabase
    .from('facilities')
    .select('id, name, address, survey_config')
    .eq('qr_slug', qr_slug)
    .single()

  if (!facility) notFound()

  const config: SurveyConfig = mergeSurveyConfig(facility.survey_config)

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-white py-8 px-4">
      <div className="w-full max-w-lg mx-auto">
        <GuestLangProvider>

          <GuestHeader subtitleKey="header_survey" />

          <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100 mb-5">
            <h2 className="font-semibold text-gray-900 mb-1">{facility.name}</h2>
            {facility.address && <p className="text-sm text-gray-400">{facility.address}</p>}
            <p className="text-sm text-gray-500 mt-2 leading-relaxed">
              <GuestText k="sv_intro" />
            </p>
          </div>

          <SurveyForm
            qrSlug={qr_slug}
            facilityName={facility.name}
            config={config}
            googleReviewUrl={config.google_review_url}
          />

        </GuestLangProvider>
      </div>
    </div>
  )
}
