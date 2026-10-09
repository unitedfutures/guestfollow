import { createServiceRoleClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { SurveyForm, type SurveyConfig } from '../../[qr_slug]/survey-form'
import { GuestLangProvider, GuestHeader, GuestText } from '@/lib/i18n/guest-lang'
import { mergeSurveyConfig } from '@/lib/survey/config'

// Beds24のオートアクションから送る個別URL（/survey/b/[BOOKID]）。
// 予約番号から予約を特定し、どの予約の回答かを記録できるようにする。
export default async function BookingSurveyPage({ params }: { params: Promise<{ book_id: string }> }) {
  const { book_id } = await params
  // 予約番号は数字のみ。それ以外は受け付けない
  if (!/^\d{1,20}$/.test(book_id)) notFound()

  const supabase = createServiceRoleClient()
  const { data: booking } = await supabase
    .from('bookings')
    .select('id, guest_name, checkin_date, checkout_date, ota_status, facility_id, facilities(id, name, address, qr_slug, survey_config)')
    .eq('beds24_booking_id', book_id)
    .maybeSingle()

  const facility = booking?.facilities as unknown as {
    id: string; name: string; address: string | null; qr_slug: string
    survey_config: unknown
  } | null
  if (!booking || !facility) notFound()

  const config: SurveyConfig = mergeSurveyConfig(facility.survey_config)

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-white py-8 px-4">
      <div className="w-full max-w-lg mx-auto">
        <GuestLangProvider>
          <GuestHeader subtitleKey="header_survey" />

          <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100 mb-4">
            <h2 className="font-bold text-gray-900">{facility.name}</h2>
            {facility.address && <p className="text-xs text-gray-400 mt-0.5">{facility.address}</p>}
            <p className="text-sm text-gray-500 mt-2 leading-relaxed">
              <GuestText k="sv_intro" />
            </p>
            {booking.guest_name && (
              <p className="text-xs text-gray-400 mt-2">
                {booking.guest_name} 様（{booking.checkin_date} 〜 {booking.checkout_date}）
              </p>
            )}
          </div>

          <SurveyForm
            qrSlug={facility.qr_slug}
            facilityName={facility.name}
            config={config}
            googleReviewUrl={config.google_review_url}
            booking={{
              id: booking.id,
              guestName: booking.guest_name,
              checkin: booking.checkin_date,
              checkout: booking.checkout_date,
            }}
          />
        </GuestLangProvider>
      </div>
    </div>
  )
}
