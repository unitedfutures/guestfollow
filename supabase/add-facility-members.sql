-- ============================================================
-- 施設メンバー共有・招待機能
-- ============================================================

-- 施設メンバー（招待承認済み）
CREATE TABLE public.facility_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid REFERENCES public.facilities ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  invited_by uuid REFERENCES auth.users,
  created_at timestamptz DEFAULT now(),
  UNIQUE (facility_id, user_id)
);

-- 招待リンク
CREATE TABLE public.facility_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid REFERENCES public.facilities ON DELETE CASCADE NOT NULL,
  invited_email text NOT NULL,
  token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  invited_by uuid REFERENCES auth.users,
  expires_at timestamptz DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- RLS有効化
ALTER TABLE public.facility_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facility_invitations ENABLE ROW LEVEL SECURITY;

-- facility_members: オーナーとメンバー自身が参照可
CREATE POLICY "facility_members: 参照" ON public.facility_members
  FOR SELECT USING (
    auth.uid() = user_id OR
    auth.uid() = (SELECT user_id FROM public.facilities WHERE id = facility_id)
  );

-- facility_members: オーナーのみ削除可
CREATE POLICY "facility_members: オーナーのみ削除" ON public.facility_members
  FOR DELETE USING (
    auth.uid() = (SELECT user_id FROM public.facilities WHERE id = facility_id)
  );

-- facility_invitations: オーナーのみ管理
CREATE POLICY "facility_invitations: オーナーのみ管理" ON public.facility_invitations
  FOR ALL USING (
    auth.uid() = (SELECT user_id FROM public.facilities WHERE id = facility_id)
  );

-- facility_invitations: tokenで公開参照（招待リンクアクセス用）
CREATE POLICY "facility_invitations: token公開参照" ON public.facility_invitations
  FOR SELECT USING (true);

-- ── facilities UPDATEポリシーをメンバーにも開放 ──
DROP POLICY IF EXISTS "facilities: 本人のみ更新" ON public.facilities;
CREATE POLICY "facilities: オーナーまたはメンバーが更新" ON public.facilities
  FOR UPDATE USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.facility_members WHERE facility_id = facilities.id AND user_id = auth.uid())
  );

-- ── bookingsをメンバーにも開放 ──
DROP POLICY IF EXISTS "bookings: 本人のみ" ON public.bookings;
CREATE POLICY "bookings: オーナーまたはメンバー" ON public.bookings
  FOR ALL USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.facility_members WHERE facility_id = bookings.facility_id AND user_id = auth.uid())
  );

-- ── guest_recordsをメンバーにも開放 ──
DROP POLICY IF EXISTS "guest_records: 管理者のみ" ON public.guest_records;
CREATE POLICY "guest_records: オーナーまたはメンバー" ON public.guest_records
  FOR ALL USING (
    auth.uid() = (SELECT user_id FROM public.bookings WHERE id = booking_id) OR
    EXISTS (SELECT 1 FROM public.facility_members WHERE facility_id = guest_records.facility_id AND user_id = auth.uid())
  );

-- ── access_codesをメンバーにも開放 ──
DROP POLICY IF EXISTS "access_codes: 管理者のみ" ON public.access_codes;
CREATE POLICY "access_codes: オーナーまたはメンバー" ON public.access_codes
  FOR ALL USING (
    auth.uid() = (SELECT user_id FROM public.bookings WHERE id = booking_id) OR
    EXISTS (SELECT 1 FROM public.facility_members WHERE facility_id = access_codes.facility_id AND user_id = auth.uid())
  );
