# 사이클 기록 — a11y 랜드마크 완전 배치(main을 각 화면이 소유)

- **작업**: cycle #8 후속 — RootLayout의 단일 main이 AppShell 페이지에서 사이드바까지 감싸 skip-link가 네비를 못 건너뛰던 문제를, main을 각 화면(콘텐츠 영역)이 소유하도록 재배치해 해결
- **브랜치**: `refactor/master-plan`
- **날짜**: 2026-06-24
- **모드**: ultracode, 연속 사이클(자동커밋). a11y 1차(랜드마크 ce01b34)·2차(포커스·h1 e55700d)의 완결편.

---

## 조사 (cy1)

cycle #8(Option X)은 무회귀 3파일로 중복 main만 제거했고, "사이드바를 main 밖으로 빼는 완전 배치(Option Y)"를 후속 분리했다. 비-AppShell 페이지 7곳(랜딩 app/page.tsx·pricing·login·signup·billing×3) 구조를 정밀 확인 — 랜딩/pricing은 `<LandingNav/>` 뒤 콘텐츠, login/signup/billing은 중앙정렬 `<div className="mx-auto flex min-h-screen …">`. 모두 자체 h1 보유(중복 h1 위험 없음).

범위 가설: layout main 비우고 AppShell·각 페이지가 main 소유.

## 검색 (cy2)

- **재사용**: `SkipToContent`(#main 타깃 그대로), `SHELL_MAIN`, 기존 main 패턴.
- **새로 만듦**: 없음(태그 재배치).

## 설계 (cy4) — 채택 + 기각

- 채택(Option Y): layout `<main>`→`<div className="flex-1">`; AppShell·AppShellSkeleton 콘텐츠 `<div>`→`<main id="main" tabIndex={-1} outline-none>`(사이드바/헤더는 형제); 비-AppShell 7페이지에 `<main id="main" tabIndex={-1}>` 추가. → **페이지당 main 정확히 1개**, skip-link가 본문 직행.
- 기각: cycle #8의 Option X(layout 단일 main 유지) — 무회귀였지만 skip이 사이드바를 못 건너뜀. 이번에 완전 배치로 대체.

## 갈린 판단 → 택한 기본값 + 이유

- **main 소유 주체**: 화면(AppShell/페이지)이 소유, layout은 중립 컨테이너 — 사이드바가 main 밖에 놓여 skip이 실효. 대가: 비-AppShell 7페이지 수정(누락 회귀 방지) — 사용자가 명시 요청한 범위.
- **테스트 반전**: cycle #8의 "AppShell/Skeleton은 main 미렌더" 단언을 "단일 main(id=main) 렌더"로 갱신(구조가 반전됐으므로).
- **시각 무변**: div→main은 시맨틱만, className 보존.

## 진행 (cy5)

수정: `app/layout.tsx`(main→div), `components/app-shell/{AppShell,AppShellSkeleton}.tsx`(콘텐츠→main#main), `app/page.tsx`·`app/pricing/page.tsx`(nav 뒤 main), `app/login/page.tsx`·`app/signup/page.tsx`(2분기)·`app/billing/{success,cancel,manage}/page.tsx`(중앙 div→main). 테스트 `appshell-guest`·`app-shell-skeleton` 단언 반전.

게이트: **typecheck ✓ · vitest 82개(19파일) ✓ · next build 성공 ✓**.

## 리뷰 (cy6)

**단일 fresh-context 독립 리뷰**(게이트 직접 재현: typecheck·vitest 82·build 그린): **머지 가능, blocker 0.**
- 라우트별 main 개수 전수 확인 — AppShell 7라우트(AppShell main)·비-AppShell 7페이지(자체 main)·loading 5(Skeleton main) 모두 정확히 1개, 중복 0. skip-link가 사이드바/헤더 형제인 main으로 직행 확인. JSX 균형·시각 무변·테스트 반전 적절.

처리(should-fix 1건 — 예리한 발견): layout이 main을 비우면서 **로딩 상태**에서 비-AppShell의 `pricing/loading.tsx`(+login Suspense fallback)가 main 0개가 되는 회귀 → 둘 다 `<main id="main">` 부여로 로딩 중에도 단일 main 불변식 유지.
후속(범위 외): 라우트 합성(layout+loading+page) main-개수 통합 가드는 unit 한계 → axe/Playwright는 후속.

## 상태

**그린** — typecheck ✓ · vitest 82개(19파일) ✓ · next build 성공 ✓. blocker 0. 커밋 가능.
이로써 a11y 랜드마크(중복 제거 → 완전 배치) + skip-link + 포커스 + h1 정비가 일단락.
