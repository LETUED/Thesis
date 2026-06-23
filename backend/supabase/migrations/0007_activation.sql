-- 0007_activation.sql — 활성화(activation) 코호트 뷰
-- 실행: Supabase 대시보드 SQL editor 에 이 주석 헤더를 유지한 채 그대로 붙여넣어 실행.
--
-- 설계 의도:
--  * 활성화 정의(docs/09 §7): 가입 후 7일 윈도 내에
--      'allocation_run'(자산배분 실행) AND 'watchlist_add'(관심종목 추가)
--    두 usage_event 를 모두 남긴 사용자.
--  * 분석 전용: 이 뷰는 service_role(분석)만 조회한다. usage_events SELECT 정책이
--    service_role 에만 열려 있으므로(0005), 일반 anon/authenticated 롤에는 노출되지 않는다.
--  * 게임화 금지: 활성화는 내부 모니터링 지표일 뿐 사용자에게 점수·뱃지로 노출하지 않는다.

create or replace view public.is_activated as
select
  u.id as user_id,
  bool_or(e.event_type = 'allocation_run')
    and bool_or(e.event_type = 'watchlist_add') as activated
from auth.users u
left join public.usage_events e
  on e.user_id = u.id
  and e.created_at >= u.created_at
  and e.created_at < u.created_at + interval '7 days'
  and e.event_type in ('allocation_run', 'watchlist_add')
group by u.id;

comment on view public.is_activated is
  '활성화 코호트(분석 전용, service_role): 가입 7일 윈도 내 allocation_run AND watchlist_add 보유 여부.';

-- ── 검증 3-test (단정 금지 — 가설·관찰 문서화) ──────────────────────────────────
-- 아래는 활성화 정의가 리텐션과 연결되는지 "확인할" 분석 쿼리/가설이다.
-- 결과를 단정하지 않는다("활성화하면 남는다"가 아니라 "유의한지 관찰한다"). 게임화에 쓰지 않는다.
--
-- ① 활성화 코호트의 day-7 재방문이 비활성화 대비 유의하게 높은가? (유의↑ 관찰)
--    가설: 활성화 사용자가 가입 후 7~8일차 재방문 비율이 더 높다.
--    select a.activated,
--           count(distinct r.user_id) filter (
--             where r.created_at >= u.created_at + interval '7 days'
--               and r.created_at <  u.created_at + interval '8 days'
--           )::float / nullif(count(distinct u.id), 0) as day7_return_rate
--    from auth.users u
--    join public.is_activated a on a.user_id = u.id
--    left join public.usage_events r on r.user_id = u.id
--    group by a.activated;
--
-- ② 활성화까지 걸린 시간의 중앙값이 7일보다 작은가? (median < 7일 관찰)
--    가설: 활성화에 도달하는 사용자는 대부분 가입 초기에 두 행동을 마친다.
--    with first_both as (
--      select u.id as user_id,
--             greatest(
--               min(e.created_at) filter (where e.event_type = 'allocation_run'),
--               min(e.created_at) filter (where e.event_type = 'watchlist_add')
--             ) - u.created_at as time_to_activate
--      from auth.users u
--      join public.usage_events e on e.user_id = u.id
--      group by u.id
--    )
--    select percentile_cont(0.5) within group (order by time_to_activate) as median_ttae
--    from first_both
--    where time_to_activate is not null;
--
-- ③ 주차별 활성화율을 모니터링한다(추세 관찰 — 목표 단정 금지).
--    가설/용도: 코호트(가입 주차)별 활성화율을 시계열로 본다. 특정 목표치 단정 금지.
--    select date_trunc('week', u.created_at) as signup_week,
--           avg(a.activated::int) as activation_rate,
--           count(*) as cohort_size
--    from auth.users u
--    join public.is_activated a on a.user_id = u.id
--    group by 1
--    order by 1;
