-- ============================================================
-- 売上レポートの3分割（売上 / OTA手数料 / 粗利益）用カラム
--
--   price      : 予約総額 ＝ 売上（既存）
--   commission : OTA手数料（Beds24が予約ごとに返す実額。無い場合や手動・Airhostは0）
--   粗利益      = price - commission（アプリ側で算出、カラムは持たない）
-- ============================================================
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS commission numeric NOT NULL DEFAULT 0;
