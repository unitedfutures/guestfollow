-- ゲストメッセージ（Beds24 / Airhost から同期）
CREATE TABLE public.messages (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings on delete cascade not null,
  facility_id uuid references public.facilities on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  ota_source text not null,                 -- 'beds24' | 'airhost'
  ota_message_id text,                       -- OTA側のメッセージID（重複防止）
  direction text not null,                   -- 'incoming'（ゲスト→ホスト） | 'outgoing'（ホスト→ゲスト）
  source text,                               -- 'guest' | 'host' | 'channel' | 'system' など生値
  body text not null,
  sent_at timestamptz not null default now(),
  read boolean not null default false,
  created_at timestamptz default now(),
  UNIQUE (ota_source, ota_message_id)
);

CREATE INDEX idx_messages_booking ON public.messages (booking_id, sent_at);
CREATE INDEX idx_messages_user ON public.messages (user_id);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- オーナーおよび施設メンバーが閲覧・操作可能
CREATE POLICY "messages: owner or member manage"
  ON public.messages FOR ALL
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.facility_members
      WHERE facility_id = messages.facility_id AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.facility_members
      WHERE facility_id = messages.facility_id AND user_id = auth.uid()
    )
  );
