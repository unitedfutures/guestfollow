-- 国籍内訳の推定用：電話番号・言語から推定した国コード
--   Airbnb経由などで国情報が取得できない予約のために保持する。
--   確定値（guest_country）とは別に持ち、画面で推定を含めるか選べるようにする。
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS guest_country_guess text;

COMMENT ON COLUMN public.bookings.guest_country_guess IS '推定国コード（電話番号→言語の順に判定）。確定情報ではない';
