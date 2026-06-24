# cycle_2 — 2세대 자율 사이클 (v2 하네스)

- **분기점**: `993be5a` (cycle_1과 **동일** 기준점 — 공정한 A/B)
- **브랜치**: `cycle_2` (worktree: `../Thesis-cycle2`)
- **하네스**: v2 = v1-live + 방향 강화 4종
  1. **가치 게이트** — 주제가 ②(부담없이 올 수 있는)/설계철학을 진전시키는지 한 줄로 못 대면 '유지보수'로 분류
  2. **유지보수 캡** — 유지보수 연속 2회까지, 3회째는 사용자-가치 주제 강제
  3. **드리프트 감지**(cy3) — 직전 3사이클이 같은 결이면 다른 후보 ≥2 제시 후 택일
  4. **주기 체크포인트** — 연속 모드 N(기본5)사이클마다 사람 방향 재확인
  - 추가: cy6 기록에 **사용자-가치 필드**(드리프트 가시화) + **위험클래스 강제 멀티렌즈 에스컬레이션** + **2단 인덱싱**(cycle_<세대>/<NN>-slug)

## v1 → v2 핵심 차이 (방향 부분)

| 항목 | v1 (cycle_1) | v2 (cycle_2) |
|------|--------------|--------------|
| done 정의 | 그린+리뷰+docs (프로세스완료) | + **사용자-가치 1줄**(없으면 유지보수 표기) |
| 주제 선택 | 자유 — 가치 검증 없음 | **가치 게이트** 통과 필수 |
| 드리프트 | 감지 장치 없음 → 후반 테스트 5연속 | **드리프트 감지 + 유지보수 캡 2회** |
| 무한모드 사람 | 재진입점 없음(수동 개입까지 표류) | **N사이클마다 체크포인트** |
| 위험클래스 리뷰 | 단일 평가자(운으로 RSC 누출 잡음) | **멀티렌즈 강제** |
| 기록 순서 | 날짜+슬러그(순서 안 보임) | **2단 인덱싱(cycle_N/NN)** |

## 무한모드

- **상태**: ON (사용자 지시 — 각 회차 cy6 완료 후 멈추지 않고 다음 회차 cy1로 자동 재점화)
- **주기 체크포인트**: 5회차마다(05·10·15) 시작 전 사람 방향 재확인(AskUserQuestion)
- **회차 카운터**: 15 완료 → 커밋(다른 세션 cycle_1 A/B 비교조사용). 이후 medium+는 사람 스펙 필요.

## 회차 (실행 시 추가)

| NN | 슬러그 | 사용자-가치 / 유지보수 | 상태 |
|----|--------|----------------------|------|
| 01 | [anon-free-conclusion-access](01-anon-free-conclusion-access.md) | **가치**: 익명도 회원가입 없이 국면+자산배분 결론 즉시 열람(북극성 ②·결론무료) | ✅ 그린 |
| 02 | [free-confidence-numeric-masking](02-free-confidence-numeric-masking.md) | **가치**: 입문자에 확신도 원시 수치(score·rationale %) 비노출 — 진입 장벽↓(북극성 ②·철학4) | ✅ 그린 |
| 03 | [allocation-freshness-disclosure](03-allocation-freshness-disclosure.md) | **가치**: 자산배분 결론의 데이터 신선도 정직 고지 — 낡은 데이터 과신 방지(철학5) | ✅ 그린 |
| 04 | [allocation-result-cache-status](04-allocation-result-cache-status.md) | **가치**: 배분 결론 자체 신선도(cache_status)로 시점 정확화 — 03 시점 불일치 근본 해소(철학5) | ✅ 그린 |
| 05 | [dashboard-next-step](05-dashboard-next-step.md) | **가치**: dashboard에 Top-Down 다음 단계 안내 — 입문자 흐름 공백 메움(②·철학2) | ✅ 그린 |
| 06 | [partial-data-notice](06-partial-data-notice.md) | **가치**: 부분실패(일부 지표 누락) 정직 고지 — 입문자 과신 방지(철학5 완전성) | ✅ 그린 |
| 07 | [regime-term-hint](07-regime-term-hint.md) | **가치**: 국면 용어(리스크온/오프) 입문자 풀이 병기 — 용어 진입장벽↓(②·철학3) | ✅ 그린 |
| 08 | [conclusion-a11y](08-conclusion-a11y.md) | **가치**: 결론(국면·배분 성향) 스크린리더 접근성 — 모두가 부담없이 결론에 접근(②·a11y) | ✅ 그린 |
| 09 | [close-price-sanitize](09-close-price-sanitize.md) | **가치**: 음수·0 종가 정제 — 오염 시세의 결론 전파 차단(데이터 신뢰성) | ✅ 그린 |
| 10 | [freshness-copy-honesty](10-freshness-copy-honesty.md) | **가치(소)**: 신선도 문구 정직화 — 자동 갱신 거짓 암시 제거(철학5) | ✅ 그린 |
| 11 | [segment-aria-pressed](11-segment-aria-pressed.md) | **가치(소)**: 세그먼트 버튼 aria-pressed — 선택 상태 색단독 의존 제거(a11y) | ✅ 그린 |
| 12 | [stale-data-age](12-stale-data-age.md) | **가치(중)**: stale 데이터 나이 노출 — 신선도 정직성 실질 완성(철학5, 신선도 결 종결) | ✅ 그린 |
| 13 | [screener-watchlist-link](13-screener-watchlist-link.md) | **가치(중)**: screener 평결→관심 담기 — 막다른 평결을 5단계 동선으로(결 전환) | ✅ 그린 |
| 14 | [portfolio-empty-screener-link](14-portfolio-empty-screener-link.md) | **가치(소)**: portfolio 빈상태 screener 동선 — 입문자 첫 담기 부담↓ | ✅ 그린 |
| 15 | [screener-label-honesty](15-screener-label-honesty.md) | **가치(중)**: 스크리너 라벨 정직화 — 동작 페이지의 거짓 "준비중"·오라벨 제거(정직성) | ✅ 그린 |

> 비교 결과: `docs/cycles/COMPARISON.md`.
