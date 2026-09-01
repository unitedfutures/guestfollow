-- 清掃担当者マスタ
CREATE TABLE public.cleaning_staff (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  active boolean not null default true,
  created_at timestamptz default now()
);

ALTER TABLE public.cleaning_staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cleaning_staff: users manage own"
  ON public.cleaning_staff FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 予約に清掃担当を紐づけ
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS cleaning_staff_id uuid REFERENCES public.cleaning_staff(id) ON DELETE SET NULL;
