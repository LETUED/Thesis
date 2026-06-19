-- 0001_init.sql — profiles 테이블 + RLS + auth.users insert 트리거
-- 실행: Supabase 대시보드 SQL editor 에 그대로 붙여넣어 실행.
--
-- 설계 의도:
--  * 각 auth.users 가입 시 profiles 행을 자동 생성(트리거, security definer).
--  * tier 는 'free'/'pro' 만 허용. 기본 'free'.
--  * RLS: 본인 행만 SELECT/UPDATE 가능. 단, 일반 user 가 자기 tier 를 'pro' 로
--    바꾸지 못하도록 UPDATE 시 tier 변경을 차단(자가 승급 방지).
--  * tier 업그레이드(free→pro)는 service_role(결제 webhook)만 가능 — service_role 은
--    RLS 를 우회하므로 별도 정책 없이 변경 가능.

-- ── 테이블 ───────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  tier text not null default 'free' check (tier in ('free', 'pro')),
  created_at timestamptz not null default now()
);

-- ── RLS 활성화 ───────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;

-- 본인 행만 조회.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles
  for select
  using (auth.uid() = id);

-- 본인 행만 수정. 단, tier 변경은 차단(자가 승급 방지 — service_role 은 RLS 우회).
drop policy if exists "profiles_update_own_no_tier" on public.profiles;
create policy "profiles_update_own_no_tier"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and tier = (select p.tier from public.profiles p where p.id = auth.uid())
  );

-- INSERT 는 트리거(security definer)가 처리하므로 일반 INSERT 정책은 두지 않는다.
-- (RLS 가 켜진 상태에서 정책이 없으면 일반 user 의 직접 INSERT 는 거부된다.)

-- ── 신규 가입 트리거 ─────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
