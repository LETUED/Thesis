-- 0004_lab_templates.sql — 조립 분석 커뮤니티 템플릿 마켓플레이스
-- 실행: Supabase SQL editor 에 붙여넣어 실행. (새 테이블/함수 추가 — 기존 데이터 영향 없음)
--
-- 설계: 누구나 공개 템플릿을 '둘러보기'(public select), 작성자만 자기 것 쓰기/수정/삭제.
-- import_count 는 비작성자도 올려야 하므로 security definer RPC 로만 증가.

create table if not exists public.lab_templates (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  description text not null default '' check (char_length(description) <= 300),
  graph jsonb not null,
  import_count integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.lab_templates enable row level security;

drop policy if exists "tpl_select_all" on public.lab_templates;
create policy "tpl_select_all" on public.lab_templates
  for select using (true);

drop policy if exists "tpl_insert_own" on public.lab_templates;
create policy "tpl_insert_own" on public.lab_templates
  for insert with check (auth.uid() = author_id);

drop policy if exists "tpl_update_own" on public.lab_templates;
create policy "tpl_update_own" on public.lab_templates
  for update using (auth.uid() = author_id) with check (auth.uid() = author_id);

drop policy if exists "tpl_delete_own" on public.lab_templates;
create policy "tpl_delete_own" on public.lab_templates
  for delete using (auth.uid() = author_id);

-- import_count 안전 증가(비작성자 허용) — security definer.
create or replace function public.increment_template_import(t uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.lab_templates set import_count = import_count + 1 where id = t;
$$;

grant execute on function public.increment_template_import(uuid) to authenticated, anon;
