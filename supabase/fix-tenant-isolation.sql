-- ============================================================
-- テナント分離（アカウント間のデータ分離）の修正
--
-- 【問題】
--   facilities（施設）と bookings（予約）の SELECT ポリシーに
--   「using (true)」の公開参照ポリシーが残っており、
--   ログイン済みの別アカウントからも 全施設・全予約 が閲覧できていた。
--   （本来この公開参照は、ログインしていない宿泊者の公開ページ用）
--
-- 【対応】
--   - 公開参照(using true)を「匿名ロール(anon)限定」に付け替える
--     → 宿泊者の公開ページ（QR登録・チェックイン・アンケート等）は従来どおり動作
--   - ログインユーザー(authenticated)は
--     自分がオーナー/メンバーの施設・予約のみ閲覧できるようにする
--
-- 【冪等】DROP POLICY IF EXISTS を使っているため複数回実行しても安全。
-- ============================================================

-- ------------------------------------------------------------
-- 1) facilities: ログインユーザーは「役割を持つ施設」のみ参照
--    ※ 従来、施設メンバー(manager/cleaner)は公開ポリシー(using true)経由でしか
--      施設が見えていなかったため、役割ベースの SELECT を明示的に用意する。
--      public.facility_role() は add-roles.sql で定義済み（owner/manager/cleaner を返す）。
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "facilities: 本人のみ参照" ON public.facilities;
DROP POLICY IF EXISTS "facilities: role select" ON public.facilities;
CREATE POLICY "facilities: role select" ON public.facilities FOR SELECT
  TO authenticated
  USING (public.facility_role(id) IN ('owner', 'manager', 'cleaner'));

-- ------------------------------------------------------------
-- 2) facilities: 宿泊者向けの公開参照は「匿名ロール」限定に付け替え
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "facilities: qr_slugで公開参照（宿泊者用）" ON public.facilities;
DROP POLICY IF EXISTS "facilities: anon public read" ON public.facilities;
CREATE POLICY "facilities: anon public read" ON public.facilities FOR SELECT
  TO anon
  USING (true);

-- ------------------------------------------------------------
-- 3) bookings: 宿泊者向けの公開参照は「匿名ロール」限定に付け替え
--    ※ ログインユーザーの SELECT は add-roles.sql の "bookings: role select"
--      （owner/manager/cleaner）が担当するため、ここでは公開参照だけを絞る。
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "bookings: pre_checkin_tokenで参照（宿泊者用）" ON public.bookings;
DROP POLICY IF EXISTS "bookings: anon public read" ON public.bookings;
CREATE POLICY "bookings: anon public read" ON public.bookings FOR SELECT
  TO anon
  USING (true);

-- ------------------------------------------------------------
-- 4) facility_invitations: token公開参照も「匿名ロール」限定に付け替え
--    ※ ログインユーザー(owner/manager)の閲覧は add-roles.sql の
--      "facility_invitations: owner or manager" が担当。
--      招待リンクは未ログイン(anon)で開かれる想定なので anon 限定で十分。
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "facility_invitations: token公開参照" ON public.facility_invitations;
DROP POLICY IF EXISTS "facility_invitations: token anon read" ON public.facility_invitations;
CREATE POLICY "facility_invitations: token anon read" ON public.facility_invitations FOR SELECT
  TO anon
  USING (true);

-- ------------------------------------------------------------
-- 確認用（任意）：適用後、facilities / bookings に using(true) が
-- authenticated へ適用されるポリシーが無いことを確認する。
--   SELECT tablename, policyname, roles, qual
--   FROM pg_policies
--   WHERE schemaname = 'public' AND tablename IN ('facilities','bookings')
--   ORDER BY tablename, policyname;
-- ------------------------------------------------------------
