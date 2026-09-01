-- 施設ごとのフリーテキストメモ
ALTER TABLE public.facilities
  ADD COLUMN IF NOT EXISTS memo text;
