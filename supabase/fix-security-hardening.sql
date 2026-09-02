-- ============================================================
-- セキュリティ強化（監査で判明した項目の修正）
--
-- 【問題】
--   1) bookings / facilities / facility_invitations に「匿名(anon)ロールで全件参照可」
--      のポリシーが残っており、公開されている anon キーだけで
--      全予約（事前登録トークン・チェックインQRトークン含む）や全施設が読めていた。
--   2) passkey_challenges に RLS が無く、anon キーで読み書きできた。
--   3) パスキー登録が guest_record_id だけで行えるため、IDを知った第三者が
--      自分の端末を他人の予約に登録できる余地があった。
--
-- 【対応】
--   1) 匿名参照ポリシーを削除。公開ページ/公開APIは service role 経由で
--      「秘密トークンで絞った1件」のみ読むよう変更済み（アプリ側デプロイ済み）。
--   2) passkey_challenges の RLS を有効化（ポリシー無し = service role のみ）。
--   3) guest_records に passkey_setup_token を追加し、登録時に必須化。
--
-- 【冪等】複数回実行しても安全。
-- ============================================================

-- 1) 匿名(anon)での全件参照を禁止
DROP POLICY IF EXISTS "bookings: anon public read" ON public.bookings;
DROP POLICY IF EXISTS "facilities: anon public read" ON public.facilities;
DROP POLICY IF EXISTS "facility_invitations: token anon read" ON public.facility_invitations;

-- 2) パスキーのチャレンジ表は service role のみ
ALTER TABLE public.passkey_challenges ENABLE ROW LEVEL SECURITY;

-- 3) パスキー登録をゲスト本人（登録直後のブラウザ）に紐づけるトークン
ALTER TABLE public.guest_records
  ADD COLUMN IF NOT EXISTS passkey_setup_token text;
