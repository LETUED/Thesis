# 03 · allocation 신선도 고지 (allocation-freshness-disclosure)

- **작업**: `/allocation` 페이지에 데이터 신선도(`cache_status`) 표기 추가. 낡은(stale) 데이터 기반 배분 결론을 고지 없이 보여주던 갭을 메움(설계철학 5).
- **브랜치**: `cycle_2` · **세대·회차**: cycle_2 / 03 (무한모드 3회차)

## ★ 사용자-가치
**입문자가 `/allocation`에서 낡은 데이터 기반 배분 결론을 신선도 고지 없이 보고 과신하지 않게 — regime과 동일하게 신선도를 정직히 표기.** (가치: 설계철학 5 신뢰)

## 조사 (cy1)
- regime은 `cache_status` 전달+표기(dashboard `StaleNotice`, GlanceHub/indicators `FreshnessChip`). 백엔드 신선도 인프라 충실(collector stale 폴백, failed_symbols/partial).
- **🔴 갭**: `AllocationResult`에 cache_status 없음 → `/allocation`(01에서 익명 개방)은 신선도 표기 0. stale 데이터 배분 결론을 고지 없이 노출 → 철학5 비대칭.

## 검색 (cy2)
- **재사용**: `PageConclusion.freshness` 슬롯(이미 존재, 미사용), `FreshnessChip`, allocation page의 기존 `getRegime` 호출(regime.cache_status 재사용).
- **기각**: `AllocationResult.cache_status` 백엔드 추가 — cy2 시점엔 "같은 snapshot이라 불필요"로 판단(→ cy6에서 이 가정의 한계 발견, 아래).

## 설계 (cy4) · 진행 (cy5) — 변경 파일 3
- `frontend/app/allocation/page.tsx` — regime을 try 밖 `RegimeResult|null`로 보관, `PageConclusion freshness={regime ? <FreshnessChip cacheStatus={regime.cache_status}/> : null}`
- `frontend/components/dashboard/FreshnessChip.tsx` — "실시간 · 30분 주기" → **"시장 데이터 · 30분 주기 갱신"**(과신 톤 제거, 철학5)
- `frontend/__tests__/freshness-chip.test.tsx`(신규) — stale/fresh/cached + 색단독금지(aria-hidden) 4케이스

**검증**: 프론트 테스트 **30/30** · 타입체크 클린 · 빌드 그린.

## 갈린 판단 (택한 기본값 + 이유)
- **신선도 출처**: client `postAllocation` 응답 vs server `getRegime`. → server `regime.cache_status` 채택(백엔드/client 변경 0, 단순). **단 cy6에서 한계 발견**: regime/allocation은 같은 캐시키(snapshot:all)지만 client 배분 재계산은 **호출 시점이 다를 수 있어** 30분 TTL 경계서 칩이 결론 신선도를 오도 가능. → 주석 정직화 + 근본해결(`AllocationResult.cache_status` + client 칩)은 04 후보.

## 리뷰 (cy6) — 위험클래스 아님(신선도 UI) → 2렌즈 경량 + 외부 오라클
- **회귀 렌즈**: 머지 가능(tier 도출 보존, regime null 안전, RSC 경계 OK, 01 변경 유지).
- **정확성 렌즈**: medium 1(신선도 시점 불일치) + low 3.
- **즉시 수정**: 과신 카피("실시간"→"시장 데이터"), 주석 정직화(시점 분리 명시), 테스트 보강(cached 양성·색단독금지 단언).
- **재검증**: 테스트 30/30 · 빌드 그린.

## 상태
- ✅ **그린** — 테스트 30/30, 타입체크, 빌드. 철학5 최소선 충족(stale 라벨 정직 고지).
- **미해결 잔여(04 후보)**:
  - (medium→기능화) **allocation 결론 자체 신선도**: `AllocationResult.cache_status`(백엔드) + client 칩으로 시점 불일치 근본 해소
  - (관찰) 부분실패 종합 고지(`partial`/`failed_symbols` 미가시화) — 개별 MetricCard만 실패 표기
- **커밋**: 자동 안 함. 01·02·03 누적을 마지막에 `/commit` 제안.
