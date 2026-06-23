-- 0006_personalization.sql — 개인화 토대(관심종목/최근본기업/저장한배분/알림)
-- 실행: Supabase 대시보드 SQL editor 에 그대로 붙여넣어 실행.
--
-- 설계 의도:
--  * 비정규화 저장: 회사 행에 company_id + ticker/name/exchange 를 함께 적재 →
--    패치 조인 없이 즉시 렌더(목록/카드). company_id = lab Company.id(ISIN형 안정 id).
--  * fail-open: 프론트는 테이블 미적용/미인증/에러 시에도 빈배열·false 로 흘러 UI 가 깨지지 않음.
--  * RLS: 전 테이블 본인 행만 select/insert/update/delete(auth.uid() = user_id).
--  * watchlists Free 상한: insert 전 트리거로 profiles.tier 확인 → free 면 1개로 강제.
--    profiles 미존재/조회불가 시 통과(fail-open) — 백엔드 best-effort 강제일 뿐.
--  * alert_rules / alert_events 는 Phase 6 알림용 토대만(여기서는 스키마+RLS 만).

-- ── 관심종목 ──────────────────────────────────────────────────────────────────
create table if not exists public.watchlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id text not null,
  ticker text,
  name text,
  exchange text,
  created_at timestamptz not null default now(),
  unique (user_id, company_id)
);

create index if not exists watchlists_user_created_idx
  on public.watchlists (user_id, created_at desc);

alter table public.watchlists enable row level security;

drop policy if exists "watchlists_select_own" on public.watchlists;
create policy "watchlists_select_own"
  on public.watchlists for select
  using (auth.uid() = user_id);

drop policy if exists "watchlists_insert_own" on public.watchlists;
create policy "watchlists_insert_own"
  on public.watchlists for insert
  with check (auth.uid() = user_id);

drop policy if exists "watchlists_update_own" on public.watchlists;
create policy "watchlists_update_own"
  on public.watchlists for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "watchlists_delete_own" on public.watchlists;
create policy "watchlists_delete_own"
  on public.watchlists for delete
  using (auth.uid() = user_id);

-- Free 상한(best-effort 백엔드 강제): free tier 는 관심종목 1개까지.
-- profiles 미존재/조회불가 → 통과(fail-open). RLS 우회 위해 security definer.
create or replace function public.enforce_watchlist_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tier text;
  v_count integer;
begin
  select tier into v_tier
  from public.profiles
  where id = new.user_id;

  -- profiles 미존재/조회불가 → fail-open(통과)
  if v_tier is null then
    return new;
  end if;

  if v_tier = 'free' then
    select count(*) into v_count
    from public.watchlists
    where user_id = new.user_id;

    if v_count >= 1 then
      raise exception 'watchlist_free_limit'
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists watchlists_enforce_limit on public.watchlists;
create trigger watchlists_enforce_limit
  before insert on public.watchlists
  for each row
  execute function public.enforce_watchlist_limit();

-- ── 최근 본 기업 ───────────────────────────────────────────────────────────────
-- 상한 20개는 프론트에서 트림(초과분 삭제). viewed_at 갱신은 upsert 로.
create table if not exists public.recently_viewed (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id text not null,
  ticker text,
  name text,
  exchange text,
  viewed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, company_id)
);

create index if not exists recently_viewed_user_viewed_idx
  on public.recently_viewed (user_id, viewed_at desc);

alter table public.recently_viewed enable row level security;

drop policy if exists "recently_viewed_select_own" on public.recently_viewed;
create policy "recently_viewed_select_own"
  on public.recently_viewed for select
  using (auth.uid() = user_id);

drop policy if exists "recently_viewed_insert_own" on public.recently_viewed;
create policy "recently_viewed_insert_own"
  on public.recently_viewed for insert
  with check (auth.uid() = user_id);

drop policy if exists "recently_viewed_update_own" on public.recently_viewed;
create policy "recently_viewed_update_own"
  on public.recently_viewed for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "recently_viewed_delete_own" on public.recently_viewed;
create policy "recently_viewed_delete_own"
  on public.recently_viewed for delete
  using (auth.uid() = user_id);

-- ── 저장한 자산배분 규칙 ─────────────────────────────────────────────────────────
create table if not exists public.saved_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  risk_tolerance text,
  horizon text,
  reflect_current_regime boolean,
  created_at timestamptz not null default now()
);

create index if not exists saved_rules_user_created_idx
  on public.saved_rules (user_id, created_at desc);

alter table public.saved_rules enable row level security;

drop policy if exists "saved_rules_select_own" on public.saved_rules;
create policy "saved_rules_select_own"
  on public.saved_rules for select
  using (auth.uid() = user_id);

drop policy if exists "saved_rules_insert_own" on public.saved_rules;
create policy "saved_rules_insert_own"
  on public.saved_rules for insert
  with check (auth.uid() = user_id);

drop policy if exists "saved_rules_update_own" on public.saved_rules;
create policy "saved_rules_update_own"
  on public.saved_rules for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "saved_rules_delete_own" on public.saved_rules;
create policy "saved_rules_delete_own"
  on public.saved_rules for delete
  using (auth.uid() = user_id);

-- ── 알림(Phase 6 토대) ─────────────────────────────────────────────────────────
create table if not exists public.alert_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  symbol text,
  threshold_kind text,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists alert_rules_user_created_idx
  on public.alert_rules (user_id, created_at desc);

alter table public.alert_rules enable row level security;

drop policy if exists "alert_rules_select_own" on public.alert_rules;
create policy "alert_rules_select_own"
  on public.alert_rules for select
  using (auth.uid() = user_id);

drop policy if exists "alert_rules_insert_own" on public.alert_rules;
create policy "alert_rules_insert_own"
  on public.alert_rules for insert
  with check (auth.uid() = user_id);

drop policy if exists "alert_rules_update_own" on public.alert_rules;
create policy "alert_rules_update_own"
  on public.alert_rules for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "alert_rules_delete_own" on public.alert_rules;
create policy "alert_rules_delete_own"
  on public.alert_rules for delete
  using (auth.uid() = user_id);

create table if not exists public.alert_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  rule_id uuid not null references public.alert_rules(id) on delete cascade,
  symbol text,
  status text,
  created_at timestamptz not null default now()
);

create index if not exists alert_events_user_created_idx
  on public.alert_events (user_id, created_at desc);

alter table public.alert_events enable row level security;

drop policy if exists "alert_events_select_own" on public.alert_events;
create policy "alert_events_select_own"
  on public.alert_events for select
  using (auth.uid() = user_id);

drop policy if exists "alert_events_insert_own" on public.alert_events;
create policy "alert_events_insert_own"
  on public.alert_events for insert
  with check (auth.uid() = user_id);

drop policy if exists "alert_events_update_own" on public.alert_events;
create policy "alert_events_update_own"
  on public.alert_events for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "alert_events_delete_own" on public.alert_events;
create policy "alert_events_delete_own"
  on public.alert_events for delete
  using (auth.uid() = user_id);
