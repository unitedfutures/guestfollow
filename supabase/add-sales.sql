-- 売上レポート用：予約金額とOTA予約ステータス
--   price      : 予約総額（OTAから取得。通貨は施設の設定に依存、通常はJPY）
--   ota_status : 'confirmed'（予約済） | 'cancelled'（キャンセル）
--                ※ 既存の status（チェックイン進捗）とは別物
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS price numeric,
  ADD COLUMN IF NOT EXISTS ota_status text NOT NULL DEFAULT 'confirmed';
