# 11 · 세그먼트 버튼 선택 상태 a11y (segment-aria-pressed)

- **작업**: AllocationPanel 투자기간 세그먼트 버튼이 선택 상태를 색/배경으로만 표시 → `aria-pressed` 추가로 스크린리더에도 선택 전달.
- **브랜치**: `cycle_2` · **세대·회차**: cycle_2 / 11 (무한모드 11회차, 자율)

## ★ 사용자-가치
**스크린리더 사용자도 어느 투자 기간이 선택됐는지 알게 — 색 단독 의존 제거(a11y·설계철학 색단독금지).**

## 조사~진행
- **출처**: 08 cy1 a11y 조사의 #4(세그먼트 버튼 `aria-pressed`/`role` 없이 색·배경으로만 활성 표시).
- **드리프트**: 09(백엔드)·10(문구) → 11(a11y). 다른 결.
- **변경 파일 1**: `frontend/components/AllocationPanel.tsx` — 세그먼트 `<button>`에 `aria-pressed={active}`.

**검증**: 타입체크 클린 · 프론트 **39 passed**(회귀 0). (AllocationPanel 렌더 테스트는 supabase/api 의존으로 무거워 typecheck+자가점검으로 검증)

## 리뷰 (cy6) — trivial a11y 1줄·위험 아님 → 자가점검 (독립 에이전트 생략)
- **자가점검**: 회귀 0(prop 추가, className/onClick 보존) / 정확성(`aria-pressed={active}` = 선택 상태 스크린리더 전달) / 타입 OK.
- *분류 정직성*: 작은 a11y 개선(가치 소).

## 상태
- ✅ **그린** — 타입체크·39/39. 세그먼트 선택 a11y.
- **미해결 잔여**: a11y #3·#5(RegimeSpectrum aria 일원화·FreshnessChip role), 09 갭③(데이터 나이), 자동 갱신(APScheduler).
- **A/B 메모**: 11회차 무드리프트. 09~11이 작은 가치(데이터/문구/a11y 잔여) 연속 — **입문자 친화·신뢰성 핵심 갭이 상당히 소진**됨을 시사. v2 하네스가 작은 가치를 정직히 표기하며 드리프트 없이 수렴 중(cycle_1 15회차 드리프트와 대조 포인트).
