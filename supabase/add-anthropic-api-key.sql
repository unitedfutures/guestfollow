-- アンケートのクチコミ下書き生成（AI）で使うAPIキー
--   アカウント（事業者）ごとに保持する。サーバー側でのみ読み取り、
--   画面には「設定済みかどうか」だけを返す。
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS anthropic_api_key text;

COMMENT ON COLUMN public.profiles.anthropic_api_key IS 'Anthropic APIキー（クチコミ下書き生成用）。未設定なら生成せず定型文を使う';
