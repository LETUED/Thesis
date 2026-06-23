# 사이클 기록 — 무가입 게스트 열람 모드

- **작업**: 로그인 없이 핵심 결론(국면·자산배분·스크리너·지표·조립분석)을 Free로 열람, 가입은 개인화/Pro에서만 유도 — 진입 마찰(인증 장벽) 제거
- **브랜치**: `refactor/master-plan`
- **날짜**: 2026-06-24
- **모드**: ultracode (xhigh + 워크플로 오케스트레이션), 연속 사이클(자동커밋) 운영

---

## 조사 (cy1) — 6영역 병렬 워크플로 + 완결성 비평

현황: 진입 마찰의 1순위는 **인증 장벽**. 미들웨어 `PROTECTED_PREFIXES`(7개 앱 경로) + 각 페이지 자체 `if(!user) redirect("/login")` **이중 게이트**로, 게스트는 아무것도 못 봄.

- **백엔드는 이미 익명→free graceful** (deps.py `get_user_tier`→FREE, 4개 엔드포인트 401 없음) → 백엔드 무변경.
- **`lib/api.ts` `cache:"no-store"`** → RSC fetch 캐시 tier 누출 차단, 무변경.
- **개인화 계층 fail-open**(throw 없음, []/false) — 단 미인증과 빈상태를 구분 못함.
- **공개 적합**: dashboard·indicators·allocation·screener·lab(결론/도구, free-tier 안전). **보호 유지**: settings(`user.email` 직접참조 NPE·계정종속), portfolio(개인화 중심).
- 완결성 비평 추가 발견: robots/sitemap 부재(동적 페이지 색인 정책 필요), `dynamic` 미선언(Full Route Cache 안전장치 권장), `login` `redirectedFrom` **오픈 리다이렉트** 취약, error/not-found 경계 전무.

범위 가설: 미들웨어 공개/보호 분리 + 5페이지 게스트 렌더 + AppShell 게스트 헤더 + 랜딩 CTA 재배치 + 보안 하드닝.

## 검색 (cy2) — 새로 짤 것 vs 가져다 쓸 것

- **재사용**: `LandingNav`의 isAuthed 게스트 CTA 패턴(로그인/무료로시작), `AppShell` 헤더 버튼(Logout/Upgrade/Manage), `Button`/`Link`/`ThemeToggle`, login `redirectedFrom` 흐름, `WatchlistButton`(인증용 그대로).
- **신규**: `lib/auth/guards.ts`(`isProtectedPath`+`safeInternalPath` 순수함수), `app/robots.ts`, `GuestWatchLink`(스크리너 게스트 로그인 유도).

## 설계 (cy4) — 채택 + 기각 대안

- 채택: **서버에서 `isAuthed=!!user` 도출 → AppShell/컴포넌트에 전달**, 게스트는 token undefined로 익명 free 데이터. tier는 항상 서버 검증값(게스트=free).
- 기각: ① AppShell `tier`를 `"guest"|"free"|"pro"`로 확장 → 결제 tier와 인증상태를 섞어 위험 → 별도 `isAuthed` boolean으로 분리. ② 미들웨어 matcher 수정으로 보호 해제 → 광범위 부작용 → `isProtectedPath` 조건만 변경. ③ 개인화 lib에 `reason:"anonymous"` 신호 추가(전 컴포넌트 로그인유도) → 범위 과대 → 이번엔 스크리너 `GuestWatchLink`만, 나머지는 후속.

## 갈린 판단 → 택한 기본값 + 이유

- **lab·portfolio 공개 여부**: lab은 공개(도구 체험 가치, save/load fail-open), portfolio는 **보호 유지**(="내 관심" 본질적 계정 종속). → 공개 5 = dashboard·indicators·allocation·screener·lab.
- **WatchlistButton 게스트 처리**: hooks 규칙 위반 없이 분리하려고 WatchlistButton을 건드리지 않고 ScreenerBoard에서 `isAuthed?WatchlistButton:GuestWatchLink`로 분기.
- **AppShell `isAuthed` 기본값 true**: 기존 7개 호출부 회귀 0 — 게스트 페이지만 명시적으로 `false` 전달.
- **`force-dynamic` 추가**: 쿠키 사용으로 이미 동적이나, Full Route Cache에 게스트 free 페이로드가 캐시되는 위험을 명시 차단(저비용 보험).
- **dashboard 개인화 게이팅**: `SessionWatch`(게스트엔 "세션 만료" 오탐)·`WelcomeLetter`·`DigestList`를 `isAuthed`로 가림.

## 진행 (cy5) — 변경 파일 + 게이트

신규: `lib/auth/guards.ts`, `app/robots.ts`, `__tests__/auth-guards.test.ts`, `__tests__/appshell-guest.test.tsx`.
수정: `lib/supabase/middleware.ts`, `components/app-shell/AppShell.tsx`, `app/{dashboard,indicators,allocation,screener,lab}/page.tsx`, `app/login/page.tsx`, `components/landing/{Hero,FinalCta}.tsx`, `components/screener/ScreenerBoard.tsx`.

게이트: **typecheck ✓ · vitest 36개 통과 ✓ · `next build` 성공 ✓** (`/robots.txt` 생성, 공개 5페이지 전부 `ƒ` 동적).

## 리뷰 (cy6)

**라운드 1 — 4렌즈 독립 적대적 패널(워크플로) + 종합**: 전원 **mergeable, blocker 0건**. 실제 오픈리다이렉트·게스트 throw·로그인 회귀 없음 검증.

발견(전부 비차단) 중 즉시 처리:
- **[should-fix] auth/callback `next` 미가드** → `safeInternalPath` 적용(login과 동일 정책). 실취약점은 아니나(origin 선행) 도입 정책의 적용 누락이라 정리.
- **[nice-to-have] 게스트 사이드바에 설정 링크 노출** → `Sidebar`/`MobileNav`에 `isAuthed` + `authOnly`(settings·portfolio) 필터, 게스트엔 숨김. (+회귀 테스트 `sidebar-guest.test.tsx`)
- **[nice-to-have] robots/미들웨어 정책 드리프트** → robots disallow를 `PROTECTED_PREFIXES` 단일출처에서 파생.
- **[nice-to-have] Hero 폴백 카피 "가입 후"** → "대시보드에서 바로"(무가입 동선 정합).

후속 분리(범위 외): BlockCanvas 게스트 저장 로그인 유도, `app/sitemap.ts`, error/not-found 경계, safeInternalPath 인코딩 경계 강화.

**라운드 2 — 수정 델타 독립 검증**: 통과(아래 상태 반영).

## 상태

**그린** — typecheck ✓ · vitest 38개(7파일) ✓ · `next build` 성공 ✓(`/robots.txt` 생성, 공개 5페이지 동적). blocker 0. 머지/커밋 가능.
잔여(후속 사이클): BlockCanvas 게스트 저장 유도, sitemap, error 경계.
