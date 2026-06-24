# cycle_3 — 3세대 자율 사이클 (v3 하네스)

- **분기점**: `993be5a` (cycle_1·cycle_2와 **동일** — 3자 A/B)
- **하네스**: v3 = git 자동도출 게이트 · 정비예산 · 드리프트차단(surface) · 외부감사 · 회차커밋. 설계·선행연구검증: [../HARNESS_V3.md](../HARNESS_V3.md)
- **하네스 커밋**: `099b0ec`

## v2 → v3 핵심 차이

| 항목 | v2 (cycle_2) | v3 (cycle_3) |
|------|--------------|--------------|
| 드리프트 판정 | theme 라벨(자가서술) → 라벨 분식 우회 | **surface(git 경로) 자동집계** — 3연속 기계 차단 |
| 가치필드 | 자가申告(1줄도 "가치 ✅") | **git diff 실측**(touched·net_prod_loc·value_size) |
| 유지보수 | 금지 캡(→0회 회피) | **정비 예산**(5회마다 1회 의무) |
| 게이트 성격 | 통과 목표(게이밍 가능) | **사후 외부감사**(보상 아님) + 테스트 위조 감시 |
| 추적성 | squash 1커밋(추적 0) | **회차=커밋**(git 자동 A/B 검증) |

## 회차

| NN | 슬러그 | surface | value_size | 사용자-가치 / 유지보수 | 상태 |
|----|--------|---------|-----------|----------------------|------|
| 01 | [guest-regime-access](01-guest-regime-access.md) | regime-page | 중 | **가치**: 게스트 무가입 국면+자산배분 결론 열람(② 진입장벽 제거·결론무료) | ✅ 그린 |
| 02 | [guest-korea-indicators](02-guest-korea-indicators.md) | regime-page(+landing) | 중 | **가치**: 게스트 한국 1순위 지표(원달러·코스피·변동성) 상태 맛보기(한국특화 ②·수치비노출) | ✅ 그린 |
| 03 | [signup-value-props](03-signup-value-props.md) | **signup**/auth | 중 | **가치**: 게스트 열람→가입 동선의 가입 동기 제공(② 진입 마찰↓) | ✅ 그린 |
| 04 | [regime-engine-tests](04-regime-engine-tests.md) | **backend** | 유지보수 | **정비**: regime 엔진 커버리지 백필(cycle_2가 회피한 영역 — v3-② 정비 예산) | ✅ 그린 |

> **★ v3 드리프트 차단 실증**: regime-page 2연속(01·02) → 03이 regime-page 수렴을 막고 **signup(미접촉)으로 전환**. cycle_2가 신선도 4연속을 못 막은 것을 v3는 surface 게이트로 차단.

> 3자 비교(v1/v2/v3)는 추후 `../COMPARISON.md`에 갱신.
