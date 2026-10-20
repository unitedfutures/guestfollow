import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getAccountAccess } from '@/lib/auth/roles'
import { ReviewsClient, type ReviewRow } from './reviews-client'
import { loadGoogleSettings } from '@/lib/google/credentials'

export default async function ReviewsPage() {
  const { isCleanerOnly } = await getAccountAccess()
  if (isCleanerOnly) redirect('/dashboard/bookings')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Google連携用の列が未作成でも落ちないようにする
  const settings = await loadGoogleSettings(supabase, user.id).catch(() => null)

  const [{ data: facilities }, { data: reviews }] = await Promise.all([
    supabase.from('facilities').select('id, name, google_location_name').order('name'),
    supabase
      .from('google_reviews')
      .select('id, facility_id, reviewer_name, reviewer_photo_url, star_rating, comment, review_create_time, reply_comment, reply_update_time, facilities(name)')
      .order('review_create_time', { ascending: false }),
  ])

  const rows: ReviewRow[] = (reviews ?? []).map(r => ({
    id: r.id as string,
    facility_id: r.facility_id as string,
    facility_name: (r.facilities as unknown as { name: string } | null)?.name ?? '',
    reviewer_name: r.reviewer_name as string | null,
    reviewer_photo_url: r.reviewer_photo_url as string | null,
    star_rating: r.star_rating as number | null,
    comment: r.comment as string | null,
    review_create_time: r.review_create_time as string | null,
    reply_comment: r.reply_comment as string | null,
    reply_update_time: r.reply_update_time as string | null,
  }))

  return (
    <ReviewsClient
      reviews={rows}
      facilities={(facilities ?? []).map(f => ({
        id: f.id as string,
        name: f.name as string,
        linked: !!(f as { google_location_name?: string | null }).google_location_name,
      }))}
      connected={!!settings?.refreshToken}
    />
  )
}
