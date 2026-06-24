# 01 · 익명 free 결론 개방 (anon-free-conclusion-access)

- **작업**: 비로그인(익명) 유저도 `/dashboard`·`/allocation`의 free 결론(시장 국면 신호 + 단순 자산배분 결론)을 회원가입 없이 본다. 회원가입은 "근거를 더 펼칠 때"만 유도.
- **브랜치**: `cycle_2`
- **세대·회차**: cycle_2 / 01 (무한모드 첫 회차)
- **분기점**: `b314381` (993be5a 코드 + v2 하네스)

## ★ 사용자-가치
**신규 방문자가 가입 강요라는 첫 진입 마찰 없이 "오늘 시장 국면 + 자산배분 결론"을 즉시 본다 — 북극성 ②("부담없이 올 수 있는 시스템") + 설계철학 6("결론 무료/근거 유료")을 백엔드뿐 아니라 프론트까지 일관 적용.**

## 조사 (cy1)
- **현황**: 백엔드는 이미 익명 free를 완전 허용(`deps.py` `get_current_user`→토큰 없으면 None, `get_user_tier`→익명은 `Tier.FREE`, *"401 안 던짐 — 익명 접근 허용"*). 랜딩(`app/page.tsx`)도 익명으로 `getRegime("free")` SSR 프리페치.
- **모순 발견**: 정작 프론트가 `/dashboard`·`/allocation`을 **이중 차단** — (1) 미들웨어 `PROTECTED_PREFIXES`, (2) 페이지 내부 `redirect("/login")`. 데이터 호출은 전부 `tier:"free"`(익명 가능)인데도 로그인을 강제 → 설계철학 6과 직접 모순, 첫 진입 마찰의 핵심.
- **범위 가설**: 결론 페이지 게이트만 해제, 근거(indicators·evidence)는 잠금 유지.

## 검색 (cy2)
- **재사용**: `LandingNav`/`FinalCta`의 `isAuthed` 분기 패턴, `UpgradeButton`(미로그인→/login 내장), `WelcomeLetter`/`DigestList`/`AllocationWithSavedRules`(localStorage·fail-open로 익명 안전), 순수 표시 컴포넌트(`GlanceHub`·`KoreaMacroBoard`·`MetricCard` 등 tier 마스킹 내장).
- **새로 짠 것**: 없음(신규 컴포넌트 0). 익명 안전화는 기존 컴포넌트에 `isAuthed` 분기만 추가.
- **깨지는 지점 2건 발견**: ① `SessionWatch`는 익명이면 항상 `session===null`→"세션 만료" 오상시 ② `AppShell`의 `LogoutButton`은 익명에게 부적절.

## 설계 (cy4)
- **채택**: `isAuthed` prop drilling(page→AppShell/AllocationWithSavedRules), 익명이면 SessionWatch 숨김·로그인/회원가입 CTA·저장섹션을 가입유도로 치환. 미들웨어에 `isProtectedPath` 순수 헬퍼 export로 회귀 테스트 가능화.
- **기각한 대안**: `AppShell.isAuthed`를 required로 — 6개 보호 페이지를 전부 수정해야 해 회귀면이 커짐. default `true`(보호 페이지는 항상 인증) + 주석 경고로 절충(리뷰도 "선택적·실버그 없음" 동의).

## 갈린 판단 (택한 기본값 + 이유)
- **익명 저장(SaveRuleButton)**: `saveRule`이 미인증 시 `return false`→SaveRuleButton이 "저장하지 못했습니다(잠시 후 다시)"라는 **거짓 일시오류** 표시. → 익명일 때 저장 섹션을 호출 자체 안 하고 **정직한 가입 유도**로 치환(cy3 "저장 스코프 밖"을 약간 넘지만 UX 안전+가치 정합으로 채택).
- **WelcomeLetter ctaHref**: 익명이 기본 `/indicators`(Pro·보호)로 가면 막힘 → 익명은 `/signup` + 라벨 "무료로 시작"으로 분기.
- **익명 보호항목 표기**: 숨김 대신 **자물쇠**(가입하면 열림 = "결핍 사다리") — 가입 유인 + 정직.

## 진행 (cy5) — 변경 파일 10
**핵심(게이트 해제 + 익명 안전화):**
- `lib/supabase/middleware.ts` — `PROTECTED_PREFIXES`에서 `/dashboard`·`/allocation` 제거 + `isProtectedPath` export
- `app/dashboard/page.tsx` — `redirect` 제거, `isAuthed` 분기(SessionWatch 가드·WelcomeLetter·본문 CTA 동선)
- `app/allocation/page.tsx` — `redirect` 제거, `isAuthed` 전달, NextStep 익명 prev 숨김
- `components/app-shell/AppShell.tsx` — `isAuthed?:boolean`(default true), 익명 로그인/회원가입 CTA, Sidebar 전달
- `components/app-shell/Sidebar.tsx` — `isAuthed`, 익명 보호항목 자물쇠, `NAV`/`isLocked` export
- `components/onboarding/WelcomeLetter.tsx` — `ctaLabel` prop
- `components/personalization/AllocationWithSavedRules.tsx` — `isAuthed`, 익명 저장섹션→가입유도(거짓 저장실패 차단)

**테스트:** `__tests__/middleware-protected-paths.test.ts`(신규) — 게이트 정책 회귀 + NAV protected↔isProtectedPath 일치 강제 + isLocked 동작

**범위 외(빌드 그린 위해 pre-existing lint 제거, 동작 0 변화):** `lab/BlockLab.tsx`(getBlock unused), `lab/canvas/floating.ts`(h unused)

**검증:** 테스트 26/26 · 타입체크 클린 · 빌드 그린(`/dashboard`·`/allocation` = Dynamic SSR).

## 리뷰 (cy6) — 위험클래스(인증·노출) 멀티렌즈
- **라운드 1 (Workflow 4렌즈: 회귀·노출·철학·품질, code-reviewer fresh-context)**: 전원 "머지 가능", 차단 0.
  - **노출 경계 핵심 결론**(교차검증): 이번 변경은 tier 도출을 안 건드림. 익명 `token=undefined`→백엔드 `Tier.FREE`→`MetricCard`가 `isPro` 분기로 raw를 `LockedValue` 잠금. **익명 화면 = 기존 로그인 free 유저 화면과 동일 → 추가 노출 0.** 과거 RSC 원시수치 누출 클래스도 `_mask_snapshot_for_free`·EvidenceLocked로 서버단 차단 확인.
  - 발견: medium 1(사이드바 익명 막다른 동선) + low 3(NextStep·WelcomeLetter 라벨·AppShell fail-unsafe) + nit 다수.
- **즉시 수정(라운드 1 발견)**: Sidebar `isAuthed`+자물쇠, NextStep 익명 prev 숨김, WelcomeLetter 익명 라벨, AppShell 주석경고, **정책 일치 강제 테스트** 추가.
- **라운드 2 (Workflow 2렌즈: 회귀·동선)**: 전원 "머지 가능", 회귀 0. 새 발견 low 3(전부 범위 밖 사각지대).
  - **즉시 수정(#2·#3)**: dashboard 본문 "조립 분석 열기"(/lab) 익명 자물쇠+가입, UpgradeButton 익명→"회원가입하고 더 보기"(결론무료→가입→Pro 순서 정렬).
- **재검증**: 테스트 26/26 · 타입 · 빌드 그린.

## 상태
- ✅ **그린** — 테스트 26/26, 타입체크, 빌드 통과. 독립 멀티렌즈(4+2렌즈) 통과. 인증 회귀 0, 노출 추가 0.
- **미해결 잔여(02회차 후보)**:
  - (low) `MobileNav`의 locked 분기가 데스크톱 `navBadge`와 중복 — 단일 출처화(드리프트 위험, 회귀 0)
  - (관찰) `/lab` 등 보호 기능의 익명 클릭은 여전히 미들웨어가 `/login`으로(자물쇠로 신호만 완화) — 클릭 동선을 `/signup`으로 통일할지 검토
- **커밋**: 자동 안 함(작업 브랜치 보존). 마지막에 `/commit` 제안.
