# 사이클 기록 — 게스트 첫 방문 오리엔테이션 + 부드러운 전환

- **작업**: 무가입 방문자가 /dashboard 첫 진입 시 "여기서 뭘 보면 되는지"(Top-Down 3단계)를 이해하고, 가입은 자연스러운 가치 지점에서만 부담 없이 유도
- **브랜치**: `refactor/master-plan`
- **날짜**: 2026-06-24
- **모드**: ultracode, 연속 사이클(자동커밋). 직전 사이클(무가입 게스트 열람, commit 7919842)의 후속.

---

## 조사 (cy1)

현황: 직전 사이클로 게스트가 /dashboard를 열 수 있게 됐으나, **오리엔테이션이 전무**. 헤더 "오늘 / 결론부터 2초"만으론 첫 방문자에게 THESIS가 무엇인지·Top-Down 흐름·무가입 범위·가입 이유를 설명하지 못함.

핵심 발견(역설): `WelcomeLetter`(NN/G 스타일 온보딩 — Top-Down 3단계 안내·localStorage dismissal·과신방지 문구·CTA)가 이미 이상적 오리엔테이션인데, **직전 사이클에서 내가 authed 전용으로 가렸다**(`dashboard:107 {isAuthed ? <WelcomeLetter/> : null}`). 즉 오리엔테이션이 가장 필요한 게스트가 그것을 못 받는 구조.

범위 가설: WelcomeLetter를 게스트에게도 노출 + 게스트용 가입 유도 한 줄.

## 검색 (cy2)

- **재사용**: `WelcomeLetter` 전체(dismiss 패턴·STEPS 카피·과신방지 문구), `GuestWatchLink`(ScreenerBoard)의 "저장 가치 제시형" 가입 유도 톤, `AppShell`/`Sidebar`의 `isAuthed` 분기 인프라, 가입 CTA 규약(/signup "무료로 시작").
- **새로 안 만듦**: 별도 게스트 오리엔테이션 컴포넌트, 새 카피 모듈(`UPSELL_COPY`는 Pro 전용이라 게스트 부적합하나, 한 줄이라 인라인), `useDismissed` 훅(리팩토링은 범위 외).

## 설계 (cy4) — 채택 + 기각

- 채택: `WelcomeLetter`에 `isAuthed?: boolean`(기본 true) 추가 → 게스트면 CTA 아래 가입 유도 한 줄. dashboard는 모두에게 노출. **단일 컴포넌트·단일 dismiss 키** 유지.
- 기각: ① 별도 `GuestOrientation` 컴포넌트 신설 → WelcomeLetter와 90% 중복 → 기각. ② 게스트/회원 dismiss 키 분리 → 가입 직후 재노출되는 약한 중복 → 단일 키로 통일(한 번 오리엔테이션 받으면 끝). ③ 새 게스트 카피 단일출처 모듈 → 한 줄에 과함 → 인라인.

## 갈린 판단 → 택한 기본값 + 이유

- **`isAuthed` 기본값 true**: 기존 호출부·authed 동작 회귀 0. 게스트 페이지만 명시적 false.
- **dismiss 키 단일 유지**(`thesis:welcome:dismissed`): 게스트·회원 공통 1회 노출. 가입 전후 재노출 안 함.
- **가입 유도 카피 = "저장" 가치**("가입하면 관심종목·자산배분 설정이 저장됩니다"): "지금 사세요" 류 강요 회피, 정보/편의 접근으로 표현(설계철학).
- **오리엔테이션 위치 = 대시보드만**(주 진입). 다른 공개 페이지는 AppShell 헤더 게스트 CTA로 충분.

## 진행 (cy5)

수정: `components/onboarding/WelcomeLetter.tsx`(isAuthed 분기), `app/dashboard/page.tsx`(게이트 제거→isAuthed 전달).
신규: `__tests__/welcome-letter.test.tsx`(게스트 노출/authed 미노출/dismiss 영속/이미 닫힘 재노출 안 함).

게이트: **typecheck ✓ · vitest 42개(8파일) ✓ · next build 성공 ✓**.

## 리뷰 (cy6)

**단일 fresh-context 독립 리뷰**: **머지 가능, blocker 0 · should-fix 0.**
- 정확성/회귀: `isAuthed` 기본 true로 authed 동작 무변경, SSR↔CSR 하이드레이션 불일치 없음(start-hidden + prop 확정), `Link onClick={dismiss}` 동기 처리로 가입 이동 전 영속 확정 — 전부 통과.
- 설계철학: 가입 유도가 '저장 가치'(구매 압박 없음), 과신방지 문구 게스트에도 유지, 입문자 톤 — 통과.
- 단순화/타입: WelcomeLetter 재사용·중복 0, prop 1개+조건부 `<p>` 1개, `any` 없음 — 통과.

처리: nice-to-have 1건(‘무료로 시작’ 클릭도 dismiss 기록하는지 커버리지) → 테스트 1케이스 추가(총 5케이스, 43개 통과).

## 상태

**그린** — typecheck ✓ · vitest 43개(8파일) ✓ · next build 성공 ✓(cy5 검증, 이후 변경은 테스트 파일뿐). blocker 0. 커밋 가능.
잔여: 없음(후속 사이클 주제는 자율 선택).
