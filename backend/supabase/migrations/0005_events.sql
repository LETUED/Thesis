-- 0005_events.sql — usage_events 계측 테이블(insert-only)
-- 실행: Supabase 대시보드 SQL editor 에 그대로 붙여넣어 실행.
--
-- 설계 의도:
--  * Phase 0 계측: 결핍 사다리/블록 등급 분석용 행동 이벤트를 append-only 로 적재.
--  * fail-open: 백엔드는 기록 실패해도 사용자 흐름을 막지 않는다(204 no-op).
--  * RLS: INSERT 만 허용(익명·로그인 모두). SELECT 는 service_role(분석)만.
--    → 사용자가 남의 이벤트를 읽거나 수정·삭제할 수 없다(insert-only 보장).
--  * user_id 는 nullable — 익명 이벤트 허용. payload 는 자유형 jsonb.

create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  tier text,
  created_at timestamptz not null default now()
);

create index if not exists usage_events_event_type_idx
  on public.usage_events (event_type, created_at desc);

-- ── RLS: insert-only ─────────────────────────────────────────────────────────
alter table public.usage_events enable row level security;

-- 누구나(anon/authenticated) INSERT 가능. SELECT/UPDATE/DELETE 정책은 두지 않으므로
-- RLS 가 켜진 상태에서 일반 롤의 읽기/수정/삭제는 전부 거부된다.
drop policy if exists "usage_events_insert_any" on public.usage_events;
create policy "usage_events_insert_any"
  on public.usage_events
  for insert
  to anon, authenticated
  with check (true);

-- service_role 은 RLS 를 우회하므로 분석용 SELECT 는 별도 정책 없이 가능하다.
