-- ============================================================
-- Googleクチコミ管理
--   Googleビジネスプロフィール（Google Business Profile API）と連携し、
--   レビューの取得・返信をGuestFollowから行う。
-- ============================================================

-- 連携用のOAuth設定とトークン（アカウント＝事業者ごと）
--   client_id / client_secret は事業者自身のGoogle Cloudプロジェクトのもの。
--   refresh_token はサーバー側だけで使い、画面には返さない。
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS google_client_id text,
  ADD COLUMN IF NOT EXISTS google_client_secret text,
  ADD COLUMN IF NOT EXISTS google_refresh_token text,
  ADD COLUMN IF NOT EXISTS google_connected_email text;

-- 施設とGoogleのロケーションの対応（accounts/123/locations/456）
ALTER TABLE public.facilities
  ADD COLUMN IF NOT EXISTS google_location_name text,
  ADD COLUMN IF NOT EXISTS google_location_title text,
  -- AI返信の材料にする設備・サービスのメモ
  ADD COLUMN IF NOT EXISTS amenities_note text;

-- 取得したクチコミ
CREATE TABLE IF NOT EXISTS public.google_reviews (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  facility_id        UUID NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  review_name        TEXT NOT NULL UNIQUE,   -- accounts/*/locations/*/reviews/*
  reviewer_name      TEXT,
  reviewer_photo_url TEXT,
  star_rating        INTEGER,                -- 1〜5
  comment            TEXT,
  review_create_time TIMESTAMPTZ,
  review_update_time TIMESTAMPTZ,
  reply_comment      TEXT,
  reply_update_time  TIMESTAMPTZ,
  synced_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS google_reviews_facility_idx ON public.google_reviews (facility_id, review_create_time DESC);
CREATE INDEX IF NOT EXISTS google_reviews_unreplied_idx ON public.google_reviews (user_id) WHERE reply_comment IS NULL;

ALTER TABLE public.google_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "google_reviews: 本人のみ参照" ON public.google_reviews;
CREATE POLICY "google_reviews: 本人のみ参照" ON public.google_reviews
  FOR SELECT USING (auth.uid() = user_id);

COMMENT ON TABLE public.google_reviews IS 'Googleビジネスプロフィールのクチコミ（同期して保存）';
