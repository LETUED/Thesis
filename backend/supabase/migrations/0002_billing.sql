-- 0002_billing.sql — profiles 에 결제(구독) 메타 컬럼 추가
-- 실행: Supabase 대시보드 SQL editor 에 붙여넣어 실행.
--
-- 설계 의도:
--  * PG 무관: tier 는 그대로 게이팅의 단일 기준. 여기 컬럼은 결제측 식별/상태 보관용.
--  * stripe_customer_id 로 webhook 의 subscription 이벤트를 user 에 역매핑.
--  * 이 컬럼들은 service_role(webhook) 만 쓰며, RLS SELECT 는 본인 행만 허용(0001 정책).

alter table public.profiles
  add column if not exists stripe_customer_id text,
  add column if not exists subscription_status text;

-- customer_id 역조회 성능 + 1:1 보장.
create unique index if not exists profiles_stripe_customer_id_key
  on public.profiles (stripe_customer_id)
  where stripe_customer_id is not null;
