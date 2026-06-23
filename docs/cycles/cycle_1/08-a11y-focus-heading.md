# 사이클 기록 — 접근성 2차(PageConclusion h1 + CompanyLookup 포커스 가시성)

- **작업**: a11y 감사 잔여 — indicators·allocation의 h1 부재 해소 + CompanyLookup 인터랙티브 요소 포커스 표시 추가
- **브랜치**: `refactor/master-plan`
- **날짜**: 2026-06-24
- **모드**: ultracode, 연속 사이클(자동커밋). a11y 1차(랜드마크 ce01b34)의 후속.

---

## 조사 (cy1)

- **D3(h1 부재)**: `PageConclusion`이 `title`을 `<p>`로 렌더 → 이를 쓰는 indicators·allocation 페이지에 문서 최상위 heading 없음. grep 결과 `<PageConclusion>` 컴포넌트 사용처는 **indicators·allocation 단 둘**이며, `<h1>` grep상 두 페이지 모두 다른 h1 없음(나머지 전 페이지는 자체 h1 보유) → title을 h1으로 올려도 중복 위험 0.
- **D5(포커스링)**: CompanyLookup 검색 input(outline-only)·지우기·결과항목·다른기업보기 버튼이 focus-visible 링 없음 → 키보드 포커스 위치 불명.

범위 가설: 두 컴포넌트 a11y 수정(신규 0).

## 검색 (cy2)

- **재사용**: 앱 표준 `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20`(Sidebar/ScreenerBoard 선례), 검색박스엔 `focus-within`.
- **새로 만듦**: 없음(기존 컴포넌트 수정).

## 설계 (cy4) — 채택 + 기각

- 채택: PageConclusion `title` `<p>`→`<h1>`(클래스 유지 — 시각 무변·시맨틱만). CompanyLookup 검색 컨테이너 `focus-within:ring`(input은 outline-none 유지하되 컨테이너가 포커스 표시) + 버튼 3종 `focus-visible:ring`.
- 기각: ① `headline`을 h1으로 → headline은 optional(없으면 h1 없음)이라 불안정; title은 required → title을 h1. ② PageConclusion에 headingLevel prop 추가 → 사용처 2곳 모두 top-level이라 YAGNI, 단순 h1. ③ input 자체에 ring → borderless input에 ring은 어색 → 컨테이너 focus-within.

## 갈린 판단 → 택한 기본값 + 이유

- **title vs headline을 h1로**: title(required, 페이지 정체) → 항상 h1 보장. headline은 결론 문장(<p> 유지).
- **input vs 컨테이너 포커스 표시**: 컨테이너 focus-within — borderless 검색 input에 가장 자연스러운 포커스 인디케이션.

## 진행 (cy5)

수정: `components/glance/PageConclusion.tsx`(title→h1), `components/company/CompanyLookup.tsx`(focus-within + 버튼 3종 focus-visible).
신규 테스트: `page-conclusion.test.tsx`(h1 role·중복 없음), `company-lookup-a11y.test.tsx`(focus-within 가드).

게이트: **typecheck ✓ · vitest 75개(18파일) ✓ · next build 성공 ✓**.

## 리뷰 (cy6)

**단일 fresh-context 독립 리뷰**: **머지 가능, blocker 0.**
- 중복 h1: PageConclusion title→h1, 사용처 indicators·allocation 둘뿐·다른 h1 없음 → 각 정확히 1개. 자체 h1 페이지(dashboard/screener 등)는 PageConclusion 미사용. AppShell·CompanyLookup 내부 heading 없음(중복 0).
- heading 계층: indicators h1→IndicatorsBoard h2, allocation h1→AllocationWithSavedRules h2. 레벨 건너뜀 없음.
- 포커스: 컨테이너 focus-within + 버튼 3종 focus-visible 앱 표준 일치. input은 컨테이너 ring으로 커버. 누락 없음. 회귀 0, any 없음.

처리(should-fix 1건 반영): CompanyLookup 포커스 테스트가 컨테이너만 약하게 커버 → 검색 API mock+findBy로 **지우기·결과 버튼의 focus-visible까지 검증**하도록 보강(테스트 76개).

후속(범위 외, 이번 변경 무관): indicators/allocation의 heading 없는 중복 `<header>` 정리.

## 상태

**그린** — typecheck ✓ · vitest 76개(18파일) ✓ · next build 성공 ✓. blocker 0. 커밋 가능.
