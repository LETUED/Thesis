# 사이클 기록 — 신뢰 레이어(데이터 기준시각·출처 푸터)

- **작업**: 첫 방문/게스트가 "이 결론 믿어도 되나?" 부담 없이 받아들이도록, 결론 카드에 "언제 기준 데이터인지 + 어디서 왔는지"(신선도·출처)를 일관 노출
- **브랜치**: `refactor/master-plan`
- **날짜**: 2026-06-24
- **모드**: ultracode, 연속 사이클(자동커밋). 직전 사이클들(7919842 게스트 열람, 333c992 게스트 오리엔테이션)의 후속.

---

## 조사 (cy1)

비대칭 발견: **과신방지(disclaimer/overconfidence)는 전 페이지 일관**한데 **"믿을 근거(신선도·출처)"는 비일관** — 신선도 2곳(GlanceHub·indicators)만, **출처 0곳**. 그런데 백엔드 응답엔 `generated_at`·`cache_status`·`source`(TickerMetric/CompanyFundamentals)·`fetched_at`·`as_of`가 다 있고 프론트 타입(`lib/types.ts`)도 미러됨 → **노출만 하면 됨**. FreshnessChip은 타임스탬프 없이 정적 라벨만, 상대시간 유틸은 전무.

범위 가설: `ConclusionCard`(regime·allocation·company 단일 통과점)에 신뢰 푸터.

## 검색 (cy2)

- **재사용**: `ConclusionCard`(슬롯 골격), `Chip`(출처 칩), `RegimeResult.generated_at`/`CompanyFundamentals.source`(응답·타입 존재), DigestList의 `Intl.DateTimeFormat` 선례.
- **새로 만듦**: 결정적 `formatAsOf` 유틸(상대시간 유틸 부재), `DataProvenance` 컴포넌트.

## 설계 (cy4) — 채택 + 기각

- 채택: `ConclusionCard`에 `provenance?: ReactNode` 슬롯 1개 + `DataProvenance`(기준시각 + 출처칩). regime·company 와이어링.
- 기각: ① 상대시간 "30분 전" → 렌더 시점마다 달라 **하이드레이션 불일치** → **절대시각 + 고정 timeZone(Asia/Seoul)** 으로 회피(FreshnessChip이 상대시간 피한 이유를 정면 해결). ② FreshnessChip 확장만 → 출처(0곳)는 못 메움 → 푸터로 신선도+출처 동시. ③ allocation 와이어링 → 규칙 산출물이라 "출처" 의미 약함 → 후속. ④ "평이한 근거(왜) 펼쳐보기" → Free가 top_drivers로 방향성 이미 봄 → 후속.

## 갈린 판단 → 택한 기본값 + 이유

- **상대시간 vs 절대시각**: 절대시각(고정 TZ·hour12:false). 하이드레이션 안정 > "n분 전" 친근함.
- **공개 도메인**: regime(시장데이터)·company(재무)만. allocation(규칙 산출물)은 출처 의미 약해 제외.
- **mock 표기**: `sourceLabel`에서 `mock→"예시 데이터"`로 **정직 표기**(실데이터 오인 방지, 신뢰의 핵심).
- **둘 다 없으면 null**: 가짜 시각/빈 출처 칩 안 보임.

## 진행 (cy5)

신규: `lib/utils/datetime.ts`(formatAsOf), `components/ui/data-provenance.tsx`(DataProvenance), `__tests__/datetime.test.ts`, `__tests__/data-provenance.test.tsx`.
수정: `components/conclusion/ConclusionCard.tsx`(provenance 슬롯), `RegimeSignalCard.tsx`(generated_at+출처), `company/CompanyVerdictCard.tsx`(sourceLabel+출처칩).

게이트: **typecheck ✓ · vitest 50개(10파일) ✓ · next build 성공 ✓**.

## 리뷰 (cy6)

**라운드 1 — 단일 fresh-context 독립 리뷰**: blocker 0. 하이드레이션(고정 TZ 절대시각 → SSR↔CSR 결정적 일치)·회귀(provenance optional, AllocationPanel 무영향)·설계철학 견고 확인.

**should-fix 1건 즉시 수정**: `sourceLabel`이 백엔드의 **조합 source**(`dart+yfinance+mock`, `yfinance+mock`, `unavailable` 등 `+` 결합)를 매핑 못 해 raw 토큰 노출 + mock 미표기 → 이 기능의 핵심 목적(정직한 출처)을 가장 빈번한 mock 폴백 케이스에서 무력화.
- 수정: `sourceLabel`을 `lib/utils/sourceLabel.ts` 순수함수로 분리 + `split("+")` 토큰 분해. mock 포함 시 "예시 데이터(포함)" 정직 표기, 실데이터·mock 둘 다 없으면 null(내부 토큰 노출 금지). 테스트 7케이스(`source-label.test.ts`) + 자정 00:00 회귀 테스트 추가.

**라운드 2 — 수정 검증**: 통과(아래 상태 반영).

nice-to-have(후속): ICU 24:00 경계는 현 스택 안전(테스트로 못박음), allocation provenance·"평이한 근거 펼쳐보기"는 후속 사이클.

## 상태

**그린** — typecheck ✓ · vitest 57개(11파일) ✓ · next build 성공 ✓. blocker 0, should-fix 처리 완료. 커밋 가능.
