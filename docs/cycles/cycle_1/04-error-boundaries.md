# 사이클 기록 — 공개 앱 견고성(에러·404 경계)

- **작업**: 게스트/방문자가 잘못된 경로나 런타임 오류를 만나도 Next.js 기본 화면 대신 THESIS 톤의 차분한 안내 + "돌아갈 길"을 보도록 에러 경계 추가
- **브랜치**: `refactor/master-plan`
- **날짜**: 2026-06-24
- **모드**: ultracode, 연속 사이클(자동커밋). 직전 사이클들(게스트 열람 7919842, 오리엔테이션 333c992, 신뢰 레이어 bd5dfd3)의 후속.

---

## 조사 (cy1)

직전 게스트 모드 조사에서 지적된 갭 확인(절대경로 글롭으로 재검증): `app/error.tsx`·`not-found.tsx`·`global-error.tsx` **전무**. 즉 게스트가 잘못된 URL/렌더 오류를 만나면 Next 기본(투박한) 화면 노출 → 무가입 공개 앱의 첫인상 손상. `loading.tsx`는 6개 존재하나 AppShell 미포함(레이아웃 점프 — 별 개념, auth 상태 접근 어려워 후속 분리).

범위 가설: 경계 3종 + 차분한 복구 경로.

## 검색 (cy2)

- **재사용**: `Button`/`Link`(돌아갈 길 CTA), 기존 `ErrorState`의 차분한 톤, `layout.tsx`의 html/body 패턴(global-error 참고).
- **새로 만듦**: `app/not-found.tsx`(서버), `app/error.tsx`(use client), `app/global-error.tsx`(자체 html/body + 인라인 스타일).

## 설계 (cy4) — 채택 + 기각

- 채택: Next 14 App Router 규격대로 — not-found(서버), error("use client" + `{error, reset}`), global-error("use client" + 자체 `<html><body>`). 각각 차분한 메시지 + 복구 경로.
- 기각: ① 단일 공용 "ErrorScreen" 컴포넌트로 3종 공유 → error/global-error의 client/html 제약이 달라 과한 추상화 → 각자 작성(중복 최소). ② global-error에서 Tailwind/테마 사용 → RootLayout 대체 시 globals.css 보장 안 됨 → **인라인 스타일**. ③ loading.tsx AppShell 래핑 → loading은 auth 상태 모름 → 후속.

## 갈린 판단 → 택한 기본값 + 이유

- **global-error 스타일**: 인라인 다크 배경(#0b0b0c). 최후 경계라 테마 컨텍스트 미보장 → 디자인 토큰 대신 자체 인라인. 라이트 테마에서도 다크지만 '드물게 뜨는 최후 안전화면'이라 허용.
- **에러 로깅**: `console.error`(useEffect). Sentry 미연동 상태라 콘솔로 두고 연동 지점 주석(시크릿/SDK 도입은 범위 외).
- **복구 경로**: error=다시시도(reset)+대시보드, not-found=대시보드+홈. 게스트도 막다른 길 없이 핵심 화면으로.

## 진행 (cy5)

신규: `app/not-found.tsx`, `app/error.tsx`, `app/global-error.tsx`, `__tests__/not-found.test.tsx`, `__tests__/error-boundary.test.tsx`.

게이트: **typecheck ✓ · vitest 62개(13파일) ✓ · next build 성공 ✓**(`/_not-found` 생성). cy5 중 테스트에서 `Error` import가 전역 생성자를 가리는 타입 충돌 → `ErrorBoundary`로 리네임해 해결.

## 리뷰 (cy6)

**단일 fresh-context 독립 리뷰**: **머지 가능, blocker 0 · should-fix 0.**
- Next 14 API 정확(error/global-error `"use client"` + `{error,reset}`, global-error 자체 html/body, not-found 서버). 환각 API 없음, 빌드 `/_not-found` 생성 실측.
- 설계철학 부합(차분·복구 경로·"사세요" 없음). global-error 다크 인라인 배경은 앱 기본 테마가 다크(`layout.tsx` defaultTheme="dark")라 일관 — 문제없음 판정.
- 순수 추가(기존 라우트/레이아웃 무수정) → 회귀 없음. any 없음, Button/Link 재사용.

처리: nice-to-have(컴포넌트명 `Error`가 전역 `Error` 섀도잉) → `RouteError`로 리네임(가독성+섀도잉 제거). 재검증 그린.

후속(범위 외): loading.tsx AppShell 래핑(레이아웃 점프), Sentry 연동(현재 console.error 훅).

## 상태

**그린** — typecheck ✓ · vitest 62개(13파일) ✓ · next build 성공 ✓(`/_not-found`). blocker 0. 커밋 가능.
