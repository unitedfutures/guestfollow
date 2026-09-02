-- ============================================================
-- 予約同期の整合性：Airhost 予約IDの一意制約
--
-- 【問題】
--   bookings.airhost_booking_id に一意制約が無く、同期が同時に走ると
--   同じ予約が二重登録され、売上/宿泊税/宿泊実績が二重計上されていた
--   （beds24_booking_id には schema.sql で unique が付いている）。
--
-- 【対応】
--   NULL を許容する部分ユニークインデックスを追加。
--   ※ 既に重複行がある場合は作成に失敗します。その場合は先に重複を解消してください:
--     SELECT airhost_booking_id, count(*) FROM public.bookings
--      WHERE airhost_booking_id IS NOT NULL GROUP BY 1 HAVING count(*) > 1;
-- ============================================================
CREATE UNIQUE INDEX IF NOT EXISTS bookings_airhost_booking_id_key
  ON public.bookings (airhost_booking_id)
  WHERE airhost_booking_id IS NOT NULL;
