-- 로그인한 사용자의 설정(진행 목록 등)을 기기 사이에서 같이 쓰기 위한 테이블. 사용자마다 한 줄.
-- Supabase 대시보드 → SQL Editor 에서 한 번 실행한다. 여러 번 실행해도 된다.
-- 앱 코드: lib/cloud.js

create table if not exists public.user_settings (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

-- 브라우저에 박히는 anon(publishable) 키로는 자기 줄만 읽고 쓸 수 있게 한다
alter table public.user_settings enable row level security;

drop policy if exists "own row: select" on public.user_settings;
drop policy if exists "own row: insert" on public.user_settings;
drop policy if exists "own row: update" on public.user_settings;
drop policy if exists "own row: delete" on public.user_settings;

create policy "own row: select" on public.user_settings
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "own row: insert" on public.user_settings
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own row: update" on public.user_settings
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own row: delete" on public.user_settings
  for delete to authenticated using ((select auth.uid()) = user_id);

-- 한 줄이 지나치게 커지지 않게 (진행 20개 × 8마디면 수십 KB 안쪽)
alter table public.user_settings drop constraint if exists user_settings_data_size;
alter table public.user_settings add constraint user_settings_data_size check (pg_column_size(data) < 262144);

revoke all on public.user_settings from anon;
grant select, insert, update, delete on public.user_settings to authenticated;
