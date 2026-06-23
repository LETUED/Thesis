# 사이클 기록 — 게스트 부드러운 전환 일관화

- **작업**: 무가입 게스트가 저장 행동을 시도할 때 조용한 실패/오해 소지 에러 대신 '저장 가치'를 제시하며 로그인으로 부드럽게 유도(GuestWatchLink 패턴 일반화)
- **브랜치**: `refactor/master-plan`
- **날짜**: 2026-06-24
- **모드**: ultracode, 연속 사이클(자동커밋). 마찰제거 1차 아크에 이은 '부담없이 + 전환' 줄기. 직전 사이클들(7919842, 333c992, bd5dfd3, ef67b55, efe40ef)의 후속.

---

## 조사 (cy1)

공개 라우트(게스트 도달 가능)에서 저장/관심 액션의 게스트 실패를 전수:
- **allocation `AllocationWithSavedRules`→`SaveRuleButton`**: 게스트 저장 시 `saveRule`→false→status="error"→"저장하지 못했습니다"(사실은 미로그인) = **오해 소지 에러**. 핵심 전환 갭.
- **lab `BlockCanvas`**: 자동저장이 silent 실패(버튼 클릭 아님 → 자연스러운 invite 지점 없음) + 1459줄 복잡 → 후속.
- **screener `CompanyLookup`/`CompanyVerdictCard`**: 저장/관심 액션 없음 → 갭 아님. (ScreenerBoard 행은 이미 GuestWatchLink 처리됨)
- **portfolio/settings**: 보호 라우트 → 게스트 도달 불가 → 제외.

범위 가설: 공유 invite 추출 + allocation 적용.

## 검색 (cy2)

- **재사용**: `Button`/`Link`, `safeInternalPath`(lib/auth/guards), `GuestWatchLink`(ScreenerBoard)의 전환 패턴, allocation page의 isAuthed.
- **새로 만듦**: 공유 `GuestActionInvite`(메시지+로그인 링크, redirectedFrom 가드).

## 설계 (cy4) — 채택 + 기각

- 채택: 공유 `GuestActionInvite` 추출 → allocation에서 게스트면 SaveRuleButton 대신 invite, "저장한 설정" 목록 숨김. **SaveRuleButton 무수정**(AllocationWithSavedRules 레벨에서 분기).
- 기각: ① SaveRuleButton에 isAuthed 주입 → 분기를 상위(AllocationWithSavedRules)에서 하면 SaveRuleButton은 순수 authed 위젯 유지 → 더 단순. ② GuestWatchLink와 GuestActionInvite 강제 통합 → 위젯(아이콘 vs 텍스트행)이 달라 결합도↑ → 동일 *행동* 패턴만 공유, 위젯은 별개. ③ lab 포함 → 자동저장 silent라 invite 지점 없음 + 복잡 → 후속.

## 갈린 판단 → 택한 기본값 + 이유

- **분기 위치**: SaveRuleButton 내부가 아닌 AllocationWithSavedRules 레벨 — SaveRuleButton을 순수하게 유지(무수정, 회귀 0).
- **isAuthed 기본 true**: 기존 호출부 보존.
- **lab/portfolio 제외**: lab=silent 자동저장(invite 지점 부재)·복잡, portfolio=보호(도달 불가). 정직하게 범위 축소.
- **redirectedFrom 가드**: 호출부가 리터럴을 넘겨도 `safeInternalPath`로 정규화(오픈리다이렉트 방어 일관).

## 진행 (cy5)

신규: `components/personalization/GuestActionInvite.tsx`, `__tests__/guest-action-invite.test.tsx`.
수정: `components/personalization/AllocationWithSavedRules.tsx`(isAuthed 분기), `app/allocation/page.tsx`(isAuthed 전달).

게이트: **typecheck ✓ · vitest 68개(15파일) ✓ · next build 성공 ✓**.

## 리뷰 (cy6)

**단일 fresh-context 독립 리뷰**: **머지 가능, blocker 0 · should-fix 0.**
- 정확성: `safeInternalPath`+`encodeURIComponent` 정확(`/allocation`→`%2Fallocation`, 외부URL→`%2Fdashboard`). 오픈리다이렉트 방어 이중(생성+소비). JSX 균형·authed 회귀 없음.
- 설계철학: 게스트가 오해 소지 "저장 못함" 에러 대신 가치 제시 안내를 봄. 강요 없음.
- 일관성/타입: GuestWatchLink와 동일 패턴 일반화(중복 아님), any 없음. lab/portfolio 제외 정당.

처리(nice-to-have 2건 즉시 반영):
- 게스트일 때 불필요한 `listSavedRules()`(Supabase 왕복) → `useEffect`에서 `if(!isAuthed) return`으로 생략.
- `GuestWatchLink`(ScreenerBoard)의 `/screener` 하드코딩 → `safeInternalPath`+`encodeURIComponent`로 `GuestActionInvite`와 redirectedFrom 처리 일관화.

후속(범위 외): lab BlockCanvas 저장/공유 전환(silent 자동저장 — 별도 패턴 필요), JSX 들여쓰기(prettier).

## 상태

**그린** — typecheck ✓ · vitest 68개(15파일) ✓ · next build 성공 ✓. blocker 0. 커밋 가능.
