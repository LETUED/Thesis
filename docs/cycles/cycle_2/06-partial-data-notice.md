# 06 · 부분실패 데이터 고지 (partial-data-notice)

- **작업**: `snapshot.partial`(일부 티커 수집 실패) 시 dashboard에 종합 고지 추가. 입문자가 '일부 지표 누락'을 모르고 결론 과신하는 갭 차단.
- **브랜치**: `cycle_2` · **세대·회차**: cycle_2 / 06 (무한모드 6회차, 자율 진행 — 멈춤 없음)

## ★ 사용자-가치
**일부 지표가 누락된 채 산출된 결론임을 입문자에게 정직하게 알려 과신을 막는다(철학5 — 데이터 완전성).**

## 조사 (cy1) · 검색 (cy2)
- **갭**: 백엔드 collector가 `failed_symbols`/`partial` 생성·MarketSnapshot 전달·types.ts 필드 존재하나 **프론트 사용처 0**. 개별 MetricCard `status=failed`("불러올 수 없음")만, 종합 고지 없음.
- **재사용**: `StaleNotice` 패턴(NoticeBanner tone=warn), `snapshot.partial`/`failed_symbols`.

## 설계 (cy3·cy4) · 진행 (cy5) — 변경 파일 3
- `frontend/components/PartialDataNotice.tsx`(신규) — `failedCount<=0`이면 null, 아니면 "일부 지표(N개)…근거가 제한된 결론" 고지(NoticeBanner warn, 비공포)
- `frontend/app/dashboard/page.tsx` — `snapshot?.partial` 시 StaleNotice 근처에 `PartialDataNotice`
- `frontend/__tests__/partial-data-notice.test.tsx`(신규) — 개수 표시/0이면 null/강요·공포 톤 미포함

**검증**: 프론트 **36 passed**(신규 3) · 타입체크 · 빌드 그린.

## 드리프트 점검
- 03·04(신선도)·05(흐름) → 06(데이터 **완전성**). 신선도와 다른 축. 직전 3회 동일 결 아님 → 허용. (단 03·04·06이 신뢰성 대범주 → 07은 다른 결로.)

## 리뷰 (cy6) — 위험클래스 아님 → 단일 fresh-context
- **결과**: "머지 가능", 차단 0. 회귀 안전(이중 가드), **stale↔partial 구조적 상호배타**(collector: 전면 실패는 partial=false→stale 경로), failedCount 정합, **`_mask_snapshot_for_free`가 partial/failed_symbols 보존 → Free·익명도 고지 수신**(01 익명 개방으로 더 중요), tone=warn 유효, 비공포 톤.
- **발견(둘 다 partial 자체 무관)**: #1 diff에 cycle_2 전체 동봉(미커밋 누적) → 사용자 커밋/비교 담당. #2 score 타입(02회차서 검증·프론트 미사용). → 수정 불필요.

## 상태
- ✅ **그린** — 프론트 36/36, 타입체크, 빌드. 부분실패 정직 고지 완성. 익명도 수신.
- **미해결 잔여(이월)**: FreshnessChip 공유 카피.
- **A/B 메모**: cycle_2가 6회차까지 v2 하네스(방향게이트·드리프트감지·독립평가)로 드리프트 없이 가치 누적 중. cycle_1(refactor/master-plan)과 대조는 사용자 검증.
