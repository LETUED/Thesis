# cycle_3 / 01 — guest-regime-access

- **작업**: 게스트(미로그인)가 가입 없이 현재 국면 결론 + 참고 자산배분을 전용 화면(`/regime`)에서 열람
- **브랜치**: cycle_3 (베이스 993be5a + v3 하네스 099b0ec)
- **세대·회차**: cycle_3 / 01

## ★ 사용자-가치
게스트가 회원가입 없이 국면 결론·자산배분 결론을 즉시 열람 → 북극성 ②(입문자 무부담 진입) 진입장벽 제거 + 결론무료 철학. (cycle_1 guest-mode·cycle_2 anon-access 와 동형 첫 수 — A/B 공정.)

## git 자동도출 가치필드 (자가申告 아님 — `git diff --cached` 실측)
- **touched**: app/regime/page.tsx(신규), components/landing/Hero.tsx, components/lab/BlockLab.tsx, components/lab/canvas/floating.ts, __tests__/regime-guest.test.tsx
- **surface**: `regime-page`(주) + `landing`(Hero CTA) + `lab`(정비)
- **net_prod_loc**: +127 (page 128 + Hero 1 − lab 2; 테스트 82줄 별도)
- **value_size**: 중 (신규 페이지 + 결론 컴포넌트 재사용)

## 조사(cy1)
993be5a 인증 이중게이트 — `lib/supabase/middleware.ts` PROTECTED_PREFIXES + 각 페이지 `if(!user) redirect`. 게스트는 국면 결론조차 못 봄(② 정면 위배). 방향게이트: 회차 0(신선) → surface 분포 없음, 가치게이트만.

## 검색(cy2)
- **재사용**: 백엔드 전체(토큰 없으면 자동 FREE, free 응답 시 evidence=EvidenceLocked로 raw 구조적 부재) · getRegime/postAllocation(token optional) · RegimeSignalCard/RegimeSpectrum/AllocationDonut/LandingNav/DisclaimerBanner/OverconfidenceBanner.
- **신규**: 게스트 전용 `/regime` 라우트(middleware 비보호) 1개.
- **제약**: 기존 페이지는 middleware+redirect 이중 차단이라 재사용 불가 → 신규 경로 필수.

## 설계(cy4)
- **채택**: 신규 app/regime/page.tsx(SSR) + LandingNav 재사용(게스트 셸) + Hero CTA /signup→/regime.
- **기각**: AppShell 재사용(로그아웃·구독 버튼이 게스트에 부적합) / dashboard 게스트화(509 LOC 과대 + 노출경계 위험↑).

## 갈린 판단
- /regime이 로그인 사용자도 도달 가능 → 초안은 토큰 미전송(게스트 전용 가정). cy6 correctness 렌즈가 "Pro 동선 불일치(major)" 지적 → `getSession()` 토큰 전달로 수정(다른 SSR 페이지와 일치). tier는 서버가 토큰 profile로만 도출 → 게스트=free 안전 유지.

## 진행(cy5)
- 변경: 위 touched. 테스트: Hero CTA(/regime) + 노출경계 pro↔free 대조.
- 게이트: typecheck ✓ / vitest 20 ✓ / build ✓ (`/regime` 4.51kB ƒ dynamic). 기존 993be5a lint 부채 2건(getBlock·h unused)이 빌드 차단 → 제거.

## 리뷰(cy6) — 위험클래스(노출경계) 멀티렌즈 3
- **exposure-security: pass** — 게스트 raw 누출 경로 없음(백엔드 fail-closed `get_user_tier` + `isLocked` 타입가드 + confidence.score 미전달). 누출 벡터 적극 탐색 결과 0.
- **design-philosophy: pass** — 결론무료/근거유료·과신방지 3중·"지금 사세요" 없음·Top-Down 충족.
- **correctness: issues→처리** — (major) Pro 동선 토큰 미전송 → 수정. (minor) 노출경계 테스트 negative 단언 동어반복 → pro↔free 대조로 강화.
- **★ 테스트 위조 감시 작동**: correctness 렌즈가 약한 단언(거짓 안전감)을 적발 → 진짜 회귀 가드로 교체. v3 멀티렌즈가 cycle_1의 'RSC 누출을 운으로 잡음'을 구조로 대체한 증거.

## 외부 감사(v3-⑦)
- 회차 1 → 직전 surface 비교 없음(드리프트 N/A). 정비 예산 N/A.
- **★ v3 하네스 결함 발견(dogfooding)**: cy6 git 자동도출 지침의 "git diff --stat 워킹트리"가 **untracked 신규파일을 누락**(page.tsx·test가 stat에 안 잡힘). `git add` 후 `--cached --stat`로 보정함. → v3 하네스 cy6 지침에 "신규파일은 `git add -N` 후 측정" 한 줄 보강 필요(다음 하네스 수정 대상).

## 상태
그린(typecheck · vitest 20 · build). 머지 가능 — exposure/design pass, correctness issues 처리 완료.
