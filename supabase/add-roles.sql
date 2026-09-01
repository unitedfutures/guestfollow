-- ============================================================
-- 施設メンバーのロール権限管理
--   owner    : 施設作成者（facilities.user_id）… 全権限
--   manager  : 現場管理責任者 … 運用＋施設設定編集＋メンバー招待
--   cleaner  : 清掃担当 … 予約の日程・ゲスト氏名・清掃割当の閲覧のみ
-- ============================================================

-- 1) role 列を追加（既存メンバーは manager 扱い＝従来どおり全権限を維持）
ALTER TABLE public.facility_members
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'manager'
  CHECK (role IN ('manager', 'cleaner'));

ALTER TABLE public.facility_invitations
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'manager'
  CHECK (role IN ('manager', 'cleaner'));

-- 2) ロール判定ヘルパー（SECURITY DEFINER で RLS 再帰を回避）
CREATE OR REPLACE FUNCTION public.facility_role(fid uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM facilities WHERE id = fid AND user_id = auth.uid()) THEN 'owner'
    ELSE (SELECT role FROM facility_members WHERE facility_id = fid AND user_id = auth.uid() LIMIT 1)
  END
$$;

-- 3) bookings：閲覧は3ロール、作成・更新・削除は owner/manager
DROP POLICY IF EXISTS "bookings: オーナーまたはメンバー" ON public.bookings;
DROP POLICY IF EXISTS "bookings: 本人のみ" ON public.bookings;
CREATE POLICY "bookings: role select" ON public.bookings FOR SELECT
  USING (public.facility_role(facility_id) IN ('owner','manager','cleaner'));
CREATE POLICY "bookings: role insert" ON public.bookings FOR INSERT
  WITH CHECK (public.facility_role(facility_id) IN ('owner','manager'));
CREATE POLICY "bookings: role update" ON public.bookings FOR UPDATE
  USING (public.facility_role(facility_id) IN ('owner','manager'));
CREATE POLICY "bookings: role delete" ON public.bookings FOR DELETE
  USING (public.facility_role(facility_id) IN ('owner','manager'));

-- 4) guest_records：owner/manager のみ（cleaner は不可）
DROP POLICY IF EXISTS "guest_records: オーナーまたはメンバー" ON public.guest_records;
DROP POLICY IF EXISTS "guest_records: 管理者のみ" ON public.guest_records;
CREATE POLICY "guest_records: owner or manager" ON public.guest_records FOR ALL
  USING (public.facility_role(facility_id) IN ('owner','manager'))
  WITH CHECK (public.facility_role(facility_id) IN ('owner','manager'));

-- 5) access_codes：owner/manager のみ
DROP POLICY IF EXISTS "access_codes: オーナーまたはメンバー" ON public.access_codes;
DROP POLICY IF EXISTS "access_codes: 管理者のみ" ON public.access_codes;
CREATE POLICY "access_codes: owner or manager" ON public.access_codes FOR ALL
  USING (public.facility_role(facility_id) IN ('owner','manager'))
  WITH CHECK (public.facility_role(facility_id) IN ('owner','manager'));

-- 6) messages：owner/manager のみ
DROP POLICY IF EXISTS "messages: owner or member manage" ON public.messages;
CREATE POLICY "messages: owner or manager" ON public.messages FOR ALL
  USING (public.facility_role(facility_id) IN ('owner','manager'))
  WITH CHECK (public.facility_role(facility_id) IN ('owner','manager'));

-- 7) survey_responses：閲覧は owner/manager（回答の公開INSERTは維持）
DROP POLICY IF EXISTS "オーナーのみ参照可" ON public.survey_responses;
CREATE POLICY "survey: owner or manager select" ON public.survey_responses FOR SELECT
  USING (public.facility_role(facility_id) IN ('owner','manager'));

-- 8) facilities 更新：owner/manager（cleaner 不可）
DROP POLICY IF EXISTS "facilities: オーナーまたはメンバーが更新" ON public.facilities;
CREATE POLICY "facilities: owner or manager update" ON public.facilities FOR UPDATE
  USING (public.facility_role(id) IN ('owner','manager'));

-- 9) cleaning_staff：オーナー本人＋（そのオーナー施設の）manager が閲覧可
DROP POLICY IF EXISTS "cleaning_staff: users manage own" ON public.cleaning_staff;
CREATE POLICY "cleaning_staff: owner manage" ON public.cleaning_staff FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "cleaning_staff: manager read" ON public.cleaning_staff FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.facility_members fm
    JOIN public.facilities f ON f.id = fm.facility_id
    WHERE f.user_id = cleaning_staff.user_id
      AND fm.user_id = auth.uid()
      AND fm.role = 'manager'
  ));

-- 10) facility_members：閲覧・削除を owner/manager に開放
DROP POLICY IF EXISTS "facility_members: 参照" ON public.facility_members;
CREATE POLICY "facility_members: select" ON public.facility_members FOR SELECT
  USING (
    auth.uid() = user_id
    OR public.facility_role(facility_id) IN ('owner','manager')
  );
DROP POLICY IF EXISTS "facility_members: オーナーのみ削除" ON public.facility_members;
CREATE POLICY "facility_members: delete" ON public.facility_members FOR DELETE
  USING (public.facility_role(facility_id) IN ('owner','manager'));

-- 11) facility_invitations：owner/manager が管理（token公開SELECTは別途維持）
DROP POLICY IF EXISTS "facility_invitations: オーナーのみ管理" ON public.facility_invitations;
CREATE POLICY "facility_invitations: owner or manager" ON public.facility_invitations FOR ALL
  USING (public.facility_role(facility_id) IN ('owner','manager'))
  WITH CHECK (public.facility_role(facility_id) IN ('owner','manager'));
