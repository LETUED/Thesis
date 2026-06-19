-- 0003_lab_canvases.sql — 조립 분석(/lab) 캔버스 영속화
-- 실행: Supabase 대시보드 SQL editor 에 붙여넣어 실행.
--
-- 설계: 사용자당 캔버스 1개(멀티페이지는 후속 — 그때 page 컬럼/별도 테이블로 확장).
-- graph(jsonb)에 직렬화한 노드/엣지/회사선택을 통째로 저장. RLS 로 본인 것만 접근.

create table if not exists public.lab_canvases (
  user_id uuid primary key references auth.users(id) on delete cascade,
  graph jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.lab_canvases enable row level security;

drop policy if exists "lab_select_own" on public.lab_canvases;
create policy "lab_select_own"
  on public.lab_canvases for select
  using (auth.uid() = user_id);

drop policy if exists "lab_insert_own" on public.lab_canvases;
create policy "lab_insert_own"
  on public.lab_canvases for insert
  with check (auth.uid() = user_id);

drop policy if exists "lab_update_own" on public.lab_canvases;
create policy "lab_update_own"
  on public.lab_canvases for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- updated_at 자동 갱신
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists lab_canvases_touch on public.lab_canvases;
create trigger lab_canvases_touch
  before update on public.lab_canvases
  for each row
  execute function public.touch_updated_at();
