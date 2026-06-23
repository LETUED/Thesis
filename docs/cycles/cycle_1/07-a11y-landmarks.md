# 사이클 기록 — 접근성 1차(단일 main 랜드마크 + skip-to-content)

- **작업**: 공개 앱의 중복 main 랜드마크(layout + AppShell)를 단일화하고 본문 바로가기(skip-link) 도입 — 키보드/스크린리더 사용자도 부담없이
- **브랜치**: `refactor/master-plan`
- **날짜**: 2026-06-24
- **모드**: ultracode, 연속 사이클(자동커밋). "부담없이"를 *모든* 사용자로 확장. 직전 사이클들(7919842, 333c992, bd5dfd3, ef67b55, efe40ef, d7995d5)의 후속.

---

## 조사 (cy1)

a11y 감사(독립 에이전트) 결함 7개 중 高 심각도 2개:
- **D1 중복 main**: `layout.tsx`가 `<main>`으로 전 페이지를 감싸는데 `AppShell`/`AppShellSkeleton`도 `<main>` 렌더 → AppShell 페이지 7곳 + loading 5곳에서 main 랜드마크 2개(중첩). 비-AppShell(랜딩·pricing)은 1개로 정상.
- **D2 skip-to-content 부재**: skip 링크·main id 타깃 전무.
- 차순위(후속): D3 indicators/allocation h1 부재, D4 CompanyLookup 콤보박스 패턴, D5 CompanyLookup 포커스링, D6 전역 focus 안전망.

범위 가설: D1+D2 핵심 묶음.

## 검색 (cy2)

- **재사용**: Tailwind `sr-only`/`focus:not-sr-only`(globals 재정의 없음 = 기본), 기존 focus-visible 패턴.
- **새로 만듦**: `SkipToContent` 컴포넌트.

## 설계 (cy4) — 채택 + 기각

- 채택(무회귀 3파일): layout `<main>`을 **단일 main**(`id="main" tabIndex={-1}`)으로 유지 + `SkipToContent`(body 첫 자식), AppShell·AppShellSkeleton의 `<main>` → `<div>` 강등. → 모든 페이지 main 1개로 수렴, 비-AppShell 페이지 무변경(회귀 0).
- 기각: **Option Y(완전 배치)** = layout main→div + AppShell main이 진짜 main(사이드바/헤더 밖) + 비-AppShell 7페이지에 main 추가. 의미상 더 정확하고 skip-link가 사이드바를 완전히 건너뛰지만, ~11파일·비-AppShell 페이지 회귀 표면 → 브라운필드 디스시플린상 다음 사이클로 분리.

## 갈린 판단 → 택한 기본값 + 이유

- **무회귀 3파일(Option X) vs 완전배치 11파일(Option Y)**: X 택. 高 심각도 D1(중복 main)을 전 페이지에서 **회귀 0**으로 제거 + skip 메커니즘 도입이 우선. 단점(앱페이지 skip 타깃이 사이드바 앞 = 완전 스킵 아님)은 후속 명시.
- **layout main 유지 vs AppShell main 유지**: layout 유지 — 비-AppShell 페이지가 layout main에 의존하므로, layout을 비우면 7페이지 회귀. AppShell쪽을 div로.
- **tabIndex={-1} + outline-none**: 프로그램적 포커스 타깃(skip 도착점)이되 마우스 클릭 시 포커스링 노이즈 억제.

## 진행 (cy5)

신규: `components/a11y/SkipToContent.tsx`, `__tests__/skip-to-content.test.tsx`.
수정: `app/layout.tsx`(SkipToContent + 단일 main id), `AppShell.tsx`·`AppShellSkeleton.tsx`(main→div), `__tests__/app-shell-skeleton.test.tsx`(role=main 단언 → div retarget + "스켈레톤 main 미렌더" 추가).

게이트: **typecheck ✓ · vitest 71개(16파일) ✓ · next build 성공 ✓**.

## 리뷰 (cy6)

**단일 fresh-context 독립 리뷰**: **머지 가능, blocker 0 · should-fix 0.**
- 랜드마크: 전 코드베이스 `<main>` 1곳(layout)만 남음 — AppShell·Skeleton 모두 div, 모든 페이지 main 정확히 1개(중복 제거 실증). id/tabIndex 정석.
- skip-link: `#main` 타깃 일치, sr-only→focus 노출(Tailwind 빌트인 확인), body 첫 자식이라 Tab 첫 진입 포착.
- 회귀: SHELL_MAIN/fullBleed 보존, 비-AppShell 페이지 정상, tabIndex=-1+outline-none 의도된 동작. 순(net) a11y 개선 확정.

처리(nice-to-have 2건 반영): AppShell 본체 "main 미렌더" 회귀 가드 테스트 추가(`appshell-guest.test.tsx`), layout에 트레이드오프(사이드바 완전 스킵은 후속) 주석 보강.

후속(범위 외): 완전 배치(사이드바 main 밖 + 비-AppShell 7페이지 main), 통합/axe 단일-main 가드, D3 h1·D4 콤보박스·D5 포커스링.

## 상태

**그린** — typecheck ✓ · vitest 72개(16파일) ✓ · next build 성공 ✓. blocker 0. 커밋 가능.
