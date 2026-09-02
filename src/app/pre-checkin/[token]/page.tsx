import { createServiceRoleClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { formatDate } from '@/lib/utils'
import { PreCheckinForm } from './pre-checkin-form'
import { CheckCircle } from 'lucide-react'
import { GuestLangProvider, GuestHeader, GuestText } from '@/lib/i18n/guest-lang'

export default async function PreCheckinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  // 公開ページ：秘密の pre_checkin_token で絞った1件のみ service role で読む（必要カラムに限定）
  const supabase = createServiceRoleClient()

  const { data: booking } = await supabase
    .from('bookings')
    .select('id, status, guest_email, guest_name, num_guests, checkin_date, checkout_date, facilities(name, address, emergency_contact, form_config, max_guests)')
    .eq('pre_checkin_token', token)
    .maybeSingle()

  if (!booking) notFound()

  if (booking.status === 'pre_checkin_done' || booking.status === 'checked_in' || booking.status === 'checked_out') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-white flex items-center justify-center p-4">
        <GuestLangProvider>
          <div className="text-center max-w-sm">
            <CheckCircle size={56} className="text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2"><GuestText k="already_title" /></h2>
            <p className="text-gray-500 text-sm"><GuestText k="already_desc" /></p>
          </div>
        </GuestLangProvider>
      </div>
    )
  }

  const facility = booking.facilities as unknown as { name: string; address: string; emergency_contact: string; form_config?: Record<string, string>; max_guests?: number | null }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white py-8 px-4">
      <div className="w-full max-w-lg mx-auto">
        <GuestLangProvider>

          <GuestHeader subtitleKey="header_register" />

          {/* 予約情報 */}
          <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100 mb-5">
            <h2 className="font-semibold text-gray-900 mb-1">{facility.name}</h2>
            {facility.address && <p className="text-sm text-gray-400 mb-3">{facility.address}</p>}
            <div className="bg-indigo-50 rounded-xl px-4 py-3 text-sm grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs text-gray-500"><GuestText k="checkin_label" /></p>
                <p className="font-semibold text-gray-800">{formatDate(booking.checkin_date)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500"><GuestText k="checkout_label" /></p>
                <p className="font-semibold text-gray-800">{formatDate(booking.checkout_date)}</p>
              </div>
            </div>
          </div>

          {/* フォーム */}
          <PreCheckinForm
            token={token}
            bookingId={booking.id}
            defaultEmail={booking.guest_email ?? ''}
            defaultName={booking.guest_name ?? ''}
            numGuests={booking.num_guests}
            maxGuests={facility.max_guests ?? 10}
            formConfig={facility.form_config ?? {}}
          />

        </GuestLangProvider>
      </div>
    </div>
  )
}
