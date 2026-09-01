-- OTA連携アカウント管理テーブル（複数アカウント対応）
CREATE TABLE public.ota_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  provider text not null check (provider in ('beds24', 'airhost')),
  label text not null default '',
  api_key text not null,
  created_at timestamptz default now()
);

ALTER TABLE public.ota_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ota_accounts: users manage own"
  ON public.ota_accounts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 施設に ota_account_id を追加
ALTER TABLE public.facilities
  ADD COLUMN IF NOT EXISTS ota_account_id uuid REFERENCES public.ota_accounts(id) ON DELETE SET NULL;
