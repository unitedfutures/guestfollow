-- ============================================================
-- Beds24 Refresh Token（invite code 由来）連携の追加
--
-- 背景:
--   Long Life Token は読み取り専用のため、メッセージ送信など書き込みができない。
--   書き込みには invite code を交換して得る Refresh Token 方式が必要。
--   Refresh Token から 24時間有効な Access Token を都度発行して使う。
--
-- 方針:
--   ota_accounts に「Long Life Token(api_key)」とは別に Refresh Token 系の列を追加し、
--   両方を並行して保持できるようにする（read=api_key / write=refresh_token）。
--
-- 冪等: IF NOT EXISTS 付きのため複数回実行しても安全。
-- ============================================================

ALTER TABLE public.ota_accounts
  -- invite code を交換して得た長寿命リフレッシュトークン（書き込み/メッセージ用）
  ADD COLUMN IF NOT EXISTS refresh_token text,
  -- リフレッシュトークンから発行した短命アクセストークン（キャッシュ）
  ADD COLUMN IF NOT EXISTS access_token text,
  -- アクセストークンの失効時刻（これを過ぎたら再発行する）
  ADD COLUMN IF NOT EXISTS access_token_expires_at timestamptz;

-- api_key（Long Life Token）は Refresh Token 単独運用も想定して NULL 許容にする
ALTER TABLE public.ota_accounts
  ALTER COLUMN api_key DROP NOT NULL;
