-- 予約元OTAチャネル（Airbnb / Booking.com / Expedia / 直接予約 など）
-- ota_source（beds24/airhost = サイトコントローラー）とは別に、実際の予約経路を保持する
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS ota_channel text;
