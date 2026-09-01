-- ============================================================
-- 会社名(company_name)が profiles に入らない問題の修正
--
-- 【問題】
--   サインアップ時、会社名は auth.users.raw_user_meta_data に保存されるが、
--   profiles を自動生成するトリガー handle_new_user() が id / email しか
--   コピーしないため、profiles.company_name が常に空になっていた。
--
-- 【対応】
--   1) トリガー関数を更新し、メタデータの company_name も profiles に入れる（今後の登録用）
--   2) 既存ユーザーの profiles.company_name を auth メタデータから補完（バックフィル）
--
-- 【冪等】何度実行しても安全。
-- ============================================================

-- 1) トリガー関数：company_name もコピーするよう更新
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, company_name)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data->>'company_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- 2) 既存ユーザーのバックフィル：
--    profiles.company_name が空で、auth 側メタデータに会社名が残っている場合に補完
update public.profiles p
set company_name = nullif(u.raw_user_meta_data->>'company_name', ''),
    updated_at = now()
from auth.users u
where u.id = p.id
  and (p.company_name is null or p.company_name = '')
  and nullif(u.raw_user_meta_data->>'company_name', '') is not null;
