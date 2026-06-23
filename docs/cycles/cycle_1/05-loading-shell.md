# 사이클 기록 — 로딩 레이아웃 정합(AppShellSkeleton)

- **작업**: 공개 페이지 첫 진입 시 loading.tsx가 사이드바/상단바 없이 맨 스켈레톤만 보이다가 AppShell이 갑자기 그려지는 레이아웃 점프 제거
- **브랜치**: `refactor/master-plan`
- **날짜**: 2026-06-24
- **모드**: ultracode, 연속 사이클(자동커밋). 직전 사이클들(게스트 열람 7919842, 오리엔테이션 333c992, 신뢰 레이어 bd5dfd3, 에러 경계 ef67b55)의 후속.

---

## 조사 (cy1)

직전 조사들에서 두 번 지적된 갭 확인: AppShell 페이지의 loading.tsx 5개(dashboard·indicators·allocation·portfolio·screener)가 전부 `mx-auto max-w-* px-4 py-8` 래퍼만 쓰고 **AppShell 크롬(사이드바 w-56·상단바)을 포함하지 않음** → SSR 대기 중 맨 스켈레톤 → 페이지 완성 시 AppShell 등장 → 레이아웃 점프(게스트 첫 진입에서 두드러짐). `pricing/loading.tsx`는 랜딩 레이아웃(section, AppShell 미사용) → 제외.

범위 가설: 정적 AppShellSkeleton으로 5개 loading 래핑.

## 검색 (cy2)

- **재사용**: `Skeleton`, AppShell의 구조(사이드바 w-56·상단바 py-3·main max-w-7xl) 미러.
- **새로 만듦**: `AppShellSkeleton`(정적, auth/tier 불필요).

## 설계 (cy4) — 채택 + 기각

- 채택: AppShell과 동일 골격의 정적 `AppShellSkeleton`(사이드바 레일 + 상단바 + main) + 5개 loading을 이걸로 감싸고 외부 패딩/폭 제거(셸 main이 제공).
- 기각: ① AppShell을 직접 재사용 → tier/isAuthed 필수 + client 의존(LogoutButton 등) → loading(서버·무상태)에 부적합 → 구조만 미러한 별도 정적 컴포넌트. ② loading마다 인라인으로 셸 반복 → 중복 → 단일 컴포넌트. ③ pricing 포함 → 랜딩 레이아웃이라 셸 씌우면 오히려 불일치 → 제외.

## 갈린 판단 → 택한 기본값 + 이유

- **AppShell 직접 사용 vs 구조 미러**: 미러(정적). loading은 auth 상태를 모르고 client 컴포넌트(Logout/Upgrade)를 끌어올 수 없음 → 치수만 맞춘 플레이스홀더가 정답.
- **내부 폭**: 기존 loading은 max-w-3xl 등으로 실제 페이지(max-w-7xl)보다 좁았음 → 셸 main(max-w-7xl)으로 통일해 실제와 더 일치.
- **pricing 제외**: 랜딩 레이아웃 일관성 우선.

## 진행 (cy5)

신규: `components/app-shell/AppShellSkeleton.tsx`, `__tests__/app-shell-skeleton.test.tsx`.
수정: `app/{dashboard,indicators,allocation,portfolio,screener}/loading.tsx`(AppShellSkeleton 래핑).

게이트: **typecheck ✓ · vitest 64개(14파일) ✓ · next build 성공 ✓**.

## 리뷰 (cy6)

**단일 fresh-context 독립 리뷰**: **머지 가능, blocker 0 · should-fix 0.**
- 치수 일치: 사이드바 w-56·상단바 px-4 py-3 md:px-8·main max-w-7xl 모두 실제 AppShell과 일치(한 줄씩 대조). 변경 전 loading은 max-w-3xl 등으로 오히려 점프를 만들고 있었음 → 제거 방향 정확.
- 회귀/접근성/타입: loading만 변경·실제 페이지 무수정, aria-busy/aria-hidden 적절, any 없음. AppShell 직접 재사용 대신 구조 미러한 결정 정당(AppShell은 tier/client 의존).

처리: 리뷰가 짚은 **드리프트 위험**(AppShell↔Skeleton 치수가 손복제라 한쪽만 바뀌면 점프 재발) → 공유 상수 `components/app-shell/layout.ts`(SHELL_SIDEBAR/HEADER/MAIN) 단일출처로 추출, AppShell·Sidebar·AppShellSkeleton 모두 참조. + 치수 회귀 테스트(main에 max-w-7xl 단언) 추가. 사이드바 패딩도 실제 Sidebar처럼 내부 자식으로 이동.

후속(범위 외): dashboard space-y-10 vs loading space-y-6 미세 간격, loading 들여쓰기(Prettier).

## 상태

**그린** — typecheck ✓ · vitest 65개(14파일) ✓ · next build 성공 ✓. blocker 0. 커밋 가능.
공유 상수화로 향후 셸 치수 변경 시 로딩 점프 재발 방지(단일출처 + 회귀 테스트).
