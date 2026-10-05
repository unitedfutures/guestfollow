-- 予約詳細の表示用：ゲストの電話番号と、Beds24のコメント・メモ
--   guest_phone  : OTA予約に含まれる電話番号（phone / mobile）
--   ota_comments : OTAから届いた予約コメント（Booking.comの備考など）
--   ota_notes    : Beds24に入力した自社メモ
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS guest_phone text,
  ADD COLUMN IF NOT EXISTS ota_comments text,
  ADD COLUMN IF NOT EXISTS ota_notes text;
