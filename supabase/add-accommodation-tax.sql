-- ============================================================
-- 宿泊税（accommodation tax）機能
--
--   facilities.accommodation_tax : 施設ごとの宿泊税ルール（JSON）
--     { "enabled": false }
--     { "enabled": true, "type": "tiered", "label": "東京都",
--       "tiers": [ {"upTo":10000,"amount":0}, {"upTo":15000,"amount":100}, {"upTo":null,"amount":200} ] }
--       ※ tiers は「1人1泊あたりの宿泊料」で段階判定。amount は1人1泊あたりの税額。
--     { "enabled": true, "type": "percent", "label": "倶知安町", "percent": 2 }
--
--   bookings.room_charge : 課税標準となる宿泊料（清掃料等を除く）。
--     Beds24は内訳(invoiceItems)から算出。取得できない場合は null（レポート側で総額 price にフォールバック）。
-- ============================================================
ALTER TABLE public.facilities
  ADD COLUMN IF NOT EXISTS accommodation_tax jsonb;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS room_charge numeric;
