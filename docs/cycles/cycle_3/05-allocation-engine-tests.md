# cycle_3 / 05 — allocation-engine-tests (정비2)

- **작업**: allocation(자산배분) 엔진 단위 테스트 백필 — compute_allocation·validate_single_position·한국 디리스킹
- **브랜치**: cycle_3 / 세대·회차: cycle_3 / 05 (5회차 체크포인트)
- **분류**: **유지보수**(백엔드 테스트 — 정비 연속 2/2, 캡 도달)

## ★ v3 작동 (이 회차에서)
- **5회차 체크포인트(v3-③)**: 사람이 "계속" 위임 → AskUserQuestion 대신 **git 자동 방향감사** 실행. surface 분포(regime 2/signup 1/backend 1) 확인 후 ② 가치 진행 판정.
- **정비 예산 연속 2 캡 도달**: 04·05 모두 정비(backend) → 06이면 v3 캡이 ② 가치 강제(시연 예고). cycle_2(정비 0)와 정반대.
- **가치게이트 억지 갭 거부**: 게스트 ② 갭 고갈(RegimeSpectrum이 용어 부분커버 등) → 억지 미세 ② 대신 정직하게 정비 선택. cycle_2가 ②갭 고갈 후 신선도 4연속 우려먹기한 것과 대조.

## git 자동도출 가치필드
- **touched**: backend/tests/test_allocation.py(신규)
- **surface**: `backend` (정비 2연속)
- **net_prod_loc**: 0 (순수 정비; 테스트 +193)
- **value_size**: 유지보수

## 조사·검색(cy1·cy2)
- cy2: allocation 직접 테스트 0건(확정, cycle_2 회피). 진입점 compute_allocation(inp, regime, cfg) + validate_single_position. Top 3 갭 = (1)현금하한·합계100 불변식 (2)headline 매도금지 (3)tier 게이팅. 입력: AllocationRequest(enum) + RegimeResult 조립.

## 진행(cy5)
- test_allocation.py: 합계100·현금하한 20%(5성향×3기간×반영 30케이스) / headline 매도금지(전 stance) / tier 게이팅 / 단일종목 15% 경계 / 한국 디리스킹 실경로.
- 게이트: backend pytest **73 passed**(기존 32 + 신규 ~41, 회귀 0).

## 리뷰(cy6) — 테스트 위조 감시(변이 주입 실측)
- **가드 6개 모두 실효 확인**(위조 아님): 합계100(+3 변이→30 fail)·현금하한(충당 제거→10 fail)·headline(늘리세요 주입→fail)·tier 양방향·단일종목 경계(`>`→`>=`→fail). 변이로 검출됨.
- **★ major→처리**: cycle_2 회피 엔진 백필이라면서 **한국 디리스킹(철학7 한국특화) 실경로 0% 커버**(contributions=[]라 조기 return). → **PRO 원달러 1500(발동) vs 1300(미발동) 대조로 stocks 차감 실경로 + korea_signals 채움 검증** 추가(derisk 죽이면 실패). FREE 디리스킹 미적용도 추가.
- **잔여(minor/nit)**: PRO evidence 내용 일부만 검증(korea_signals만) / reflect=False headline 3케이스 동일경로 중복 / sector_tilt·risk_label 카피 금지어 미점검 → 다음 정비 후보.

## 외부 감사(v3-⑦)
- surface `backend` 정비 2연속 — v3 정비 캡(2) 도달 → **06 이면 ② 가치 강제**(캡 시연 예고).
- value_size: 01·02·03 중(②) / 04·05 유지보수 = **②3 + 정비2**. cycle_2(정비 0·과대포장)와 구조적 대조.

## 상태
그린(backend pytest 73). 머지 가능 — major(한국 디리스킹 미커버) 처리 완료.
