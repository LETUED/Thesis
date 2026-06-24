# 12 · stale 데이터 나이 노출 (stale-data-age) — 신선도 결 종결편

- **작업**: FreshnessChip이 stale일 때 데이터 생성 시각(generated_at)을 절대시각으로 병기. "얼마나 오래됐는지" 불투명하던 09 갭③ 해결.
- **브랜치**: `cycle_2` · **세대·회차**: cycle_2 / 12 (무한모드 12회차, 자율 — **신선도 결 종결편**)

## ★ 사용자-가치
**stale일 때 "06-24 14:30 기준" 처럼 데이터 나이를 정직히 노출 — 입문자가 얼마나 오래된 데이터인지 알고 과신하지 않게(철학5 실질 완성).**

## 조사 (cy1) — 정직한 가치 소진 판정
- 12 cy1(Explore): **핵심 입문자 가치 거의 소진.** 후보1(데이터 나이)만 "중" 실질 가치(신선도 종결), 후보2(ResizeObserver 일원화·중복 미발생)·3(FreshnessChip role=status·live region 실익 0)·4(RegimeSpectrum aria·발화 정확)는 **억지 갭으로 판정·기각**(v2 가치 게이트 작동).
- **권고**: 후보1 후 5단계(스크리너/포트폴리오)·유지보수로 결 전환.

## 진행 (cy5) — 변경 파일 5
- `frontend/components/dashboard/FreshnessChip.tsx` — `generatedAt?` prop + `formatAsOf`(Intl `timeZone:"Asia/Seoul"`·`hour12:false` 고정 = 하이드레이션 안전), stale에만 "{시각} 기준" 병기
- `GlanceHub`·`AllocationPanel`·`indicators/page` — 3 호출처에 `generated_at` 전달
- `frontend/__tests__/freshness-chip.test.tsx` — stale+generatedAt 시각 병기 / fresh 미노출 2케이스(UTC 05:30Z→KST 14:30 변환 검증)

**검증**: 프론트 **41 passed**(신규 2) · 타입체크 · 빌드 그린.

## 리뷰 (cy6) — 하이드레이션 집중 단일 fresh-context
- **결과**: "머지 가능", 차단 0. **하이드레이션 안전**(타임존 고정·숫자 포맷·Date.now 미사용 → 서버/클라 동일, client/server 컴포넌트 양쪽 OK), 회귀(optional·NaN 가드·stale만), 철학(절대시각 정직), 테스트(UTC→KST 실효 검증) 모두 OK.

## 상태
- ✅ **그린** — 프론트 41/41, 타입체크, 빌드. 신선도 정직성 **실질 완성**(나이 노출).
- **결 전환 신호**: 신선도/입문자 친화 핵심 가치 소진. **13부터 5단계(스크리너/포트폴리오 실기능) 또는 유지보수로 결 전환** — 미세 보강 짜내기는 v2 가치 게이트(억지 갭 금지) 위반.
- **A/B 메모**: 12회차 무드리프트 수렴. v2 하네스의 **가치 게이트가 억지 갭을 거부**(후보2·3·4 기각)하고 **수렴을 정직 표기**하는 것이 cycle_1(15회차 드리프트·표류)과의 결정적 대조점.
