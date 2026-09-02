-- ============================================================
-- 清掃担当者にメールアドレス（任意）を追加
--
-- 目的：ログインアカウントを持つ清掃担当者と、名前だけの清掃担当者を
--       ひとつの一覧で扱えるようにする。
--       アカウントの有無は、このメールアドレスを
--       facility_members / facility_invitations と突き合わせて判定する
--       （cleaning_staff 側に状態を持たせない＝二重管理を避ける）。
-- ============================================================

ALTER TABLE public.cleaning_staff
  ADD COLUMN IF NOT EXISTS email text;

-- 同じオーナーの中でメールアドレスの重複を防ぐ（NULLは何件でも可＝名前だけの担当者）
CREATE UNIQUE INDEX IF NOT EXISTS cleaning_staff_user_email_key
  ON public.cleaning_staff (user_id, lower(email))
  WHERE email IS NOT NULL;
