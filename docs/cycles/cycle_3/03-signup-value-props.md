# cycle_3 / 03 — signup-value-props

- **작업**: 게스트가 결론을 본 뒤 가입 결정 시 "무엇이 펼쳐지는지" 가치 제안(SignupValueProps)을 signup 에 추가
- **브랜치**: cycle_3 / 세대·회차: cycle_3 / 03

## ★ 사용자-가치
게스트 열람→가입 동선의 마지막 마찰(가입 동기 부재) 제거 — 입문자가 가입 이득을 눈높이로 이해(② 진입). 결론무료/근거유료를 가입 동기로 정직하게 연결.

## ★ v3 드리프트 차단 작동 (이 회차의 핵심)
- 직전 surface = `regime-page` **2연속**(01·02). 03이 regime-page(예: /regime 용어풀이)면 **3연속 → v3 게이트 차단**.
- 미접촉 surface 후보 ≥2 제시 → **signup**(가입 동기) 택. → surface `regime-page` 수렴을 막고 `signup`(미접촉)으로 전환.
- **cycle_2 대조**: v2는 신선도 4연속·동선 3연속을 못 막았으나, v3는 surface(git 경로) 자동집계로 3연속 직전에 차단. **v2 핵심 실패를 v3가 구조로 해결함을 실증.**

## git 자동도출 가치필드
- **touched**: components/auth/SignupValueProps.tsx(신규), app/signup/page.tsx, __tests__/signup-value-props.test.tsx
- **surface**: `signup`/`auth` (미접촉 — 드리프트 차단 결과)
- **net_prod_loc**: +45 (SignupValueProps 37 + signup 8; 테스트 19 별도)
- **value_size**: 중 (신규 컴포넌트 + 삽입)

## 조사·검색·설계(cy1·cy2·cy4)
- cy1: regime-page 2연속 차단 대상. pricing 은 이미 공개·입문자친화. signup 은 폼만(가입 동기 부재).
- cy2: WelcomeLetter(로그인 onboarding용)는 게스트 signup 부적합. ValuePillars(랜딩 서사)와 맥락 다름 → 중복 아님. 가치 제안은 신규 소량.
- cy4: 순수 컴포넌트 SignupValueProps 분리(테스트 용이) → 폼 위 삽입. "실시간" 과장 회피(30분 주기 정직).

## 진행(cy5)
- 게이트: typecheck ✓ / vitest 24 ✓ / build ✓. 테스트: 가치 3가지 노출 + '실시간' 과장 부재(설계철학 회귀 가드).

## 리뷰(cy6) — 비위험, 단일 fresh-context
- 설계철학 통과(매수권유·수익보장 없음, 갱신주기 정직). 정확성 통과(폼 로직 무영향). 중복 정당(ValuePillars와 맥락 분리).
- **minor→처리**: 항목1 "지표별 기여도·신호를 모두 확인"이 Free 가입만으로 Pro 잠금 근거 해금되는 듯 오인 소지 → "Pro에서 모두 펼쳐보기"로 정직화(근거유료 명시).

## 외부 감사(v3-⑦)
- surface: regime-page(01·02) → **signup**(03). regime-page 연속 끊김 — 드리프트 차단 성공.
- value_size 중·중·중 — 소 3연속 아님. 정비 예산: 3회 정비 0(5 미달).

## 상태
그린(typecheck · vitest 24 · build). 머지 가능.
