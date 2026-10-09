-- アンケート回答を予約に紐づける
--   Beds24のオートアクションから /survey/b/[BOOKID] を送ると、
--   どの予約の回答かを確実に特定できる（施設ごとの固定URLは従来どおり匿名）。
ALTER TABLE public.survey_responses
  ADD COLUMN IF NOT EXISTS booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS survey_responses_booking_id_idx
  ON public.survey_responses (booking_id);

COMMENT ON COLUMN public.survey_responses.booking_id IS '回答元の予約（個別URLから回答した場合のみ）。固定URLからの匿名回答はNULL';
