# 13 · screener 평결 → 관심 담기 (screener-watchlist-link)

- **작업**: screener 종목 평결(CompanyLookup)이 "보고 끝"인 막다른 길이었던 것을, 평결 헤더에 관심(별) 버튼을 달아 portfolio로 잇는 1-클릭 동선으로.
- **브랜치**: `cycle_2` · **세대·회차**: cycle_2 / 13 (무한모드 13회차, **결 전환 — 입문자 친화→5단계 기능 동선**)

## ★ 사용자-가치
**screener에서 본 종목을 곧장 관심(포트폴리오)으로 담는 1-클릭 — 막다른 평결을 5단계 동선으로 연결.**

## 조사 (cy1, Explore) — 5단계는 동작함, 진짜 갭은 동선 단절
- screener=단일 종목 조회기(검색·평결 동작), portfolio=watchlist(Supabase 직결), 백엔드 API 충분. **기능 미구현 아님.**
- **진짜 갭**: ③→④ NextStep 없음, **평결카드↔portfolio 단절**, portfolio 빈상태가 /lab만 안내, dashboard ④ "준비중" 죽은 카드.
- **13 선정 = ①(평결 관심담기)** — 작고 철학 충돌 없음. ②(국면 프리셋)는 종목 추천 철학 충돌 위험 → 별도. ③(동선 완결)은 "준비중" 정직성 검토 필요 → 14+.

## 진행 (cy5) — 변경 파일 1
- `frontend/components/company/CompanyLookup.tsx` — 평결 헤더에 기존 `WatchlistButton`(`company={toCompanyRef(selected)}`, tier, size=sm) 삽입. flex로 '다른 기업 보기'와 묶음.

**검증**: 타입체크 클린 · 빌드 그린 · 기존 테스트 회귀 0(41 passed). (WatchlistButton은 supabase 의존으로 단위테스트 무거워 빌드/타입+독립평가로 검증)

## 리뷰 (cy6) — 단일 fresh-context
- **결과**: "머지 가능", 차단 0. 회귀(레이아웃 shrink-0·기존 흐름 보존)·정확성(toCompanyRef 타입 일치·selected 분기 안전·로딩 중 담기 의도부합)·철학(WatchlistButton 업셀 안내·aria-pressed·색외표현 이미 구비)·단순화(MyWatchSection 패턴 재사용) OK.
- 참고(비차단): WatchlistButton 인스턴스별 상태(기존 특성, screener 인스턴스 1개라 무관).

## 상태
- ✅ **그린** — 타입체크·빌드·41/41. screener→portfolio 동선 연결.
- **미해결 잔여(14+ 후보)**: ③ Top-Down 사슬 완결(dashboard ④ 링크·allocation NextStep ④·portfolio 빈상태 screener — "준비중" 정직성 검토 동반), ② 국면 연계 검색어 시드(철학 안전 범위 정의 필요).
- **A/B 메모**: 13회차 무드리프트. 입문자 친화(01~12) 소진 후 **5단계 기능 동선으로 자연 확장** — v2 하네스가 가치 소진을 정직 표기하고 인접 영역으로 결을 넓힘. cycle_1(15회차 표류)과 대조: cycle_2는 13회차에 의미있는 새 영역으로 전환.
