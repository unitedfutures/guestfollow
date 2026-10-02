-- 売上集計用：請求合計（宿泊料＋人数追加・清掃料金などの追加請求、割引を反映）
--   Beds24 の booking.price は宿泊料のみで追加請求を含まないため、
--   売上には invoice_total（請求明細 charge の合計）を使う。
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS invoice_total numeric;

COMMENT ON COLUMN public.bookings.invoice_total IS '請求合計（Beds24の請求明細chargeの合計）。未同期の予約はNULLでpriceを使う';
