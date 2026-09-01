-- ============================================================
-- 宿泊者の国籍取得改善：OTA（Beds24等）が持つゲストの国コードを保存
--
--   guest_country : ゲストの国コード（ISO 3166-1 alpha-2、例 JP / US / AT）
--     Beds24予約の country2 / country から取得。
--     電子宿泊者名簿(guest_records)が無い予約でも、宿泊実績報告の国籍別内訳に利用する。
-- ============================================================
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS guest_country text;
