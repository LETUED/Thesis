# 사이클 기록 — SEO sitemap

- **작업**: robots.ts와 짝이 되는 app/sitemap.ts 추가 — 무가입 공개 결론 페이지의 검색엔진 발견성
- **브랜치**: `refactor/master-plan`
- **날짜**: 2026-06-24
- **모드**: ultracode, 연속 사이클(자동커밋). guest-mode(robots.ts)·백엔드 엔진테스트(eae5f63) 후속.

---

## 조사 (cy1)

`app/sitemap.ts` 부재. `robots.ts`는 보호 disallow를 `PROTECTED_PREFIXES`(guards.ts) 단일출처에서 파생 중. 공개 경로 목록은 robots 주석에만 있고 코드 단일출처 없음 → sitemap 추가 시 공개 경로를 const로 단일출처화하면 robots(보호)와 sitemap(공개) 경계가 정합.

범위 가설: PUBLIC_ROUTES 단일출처 + sitemap.ts.

## 검색 (cy2)

- **재사용**: guards `PROTECTED_PREFIXES`/`isProtectedPath`, robots 패턴, Next `MetadataRoute.Sitemap` 타입.
- **새로 만듦**: guards `PUBLIC_ROUTES` const, `app/sitemap.ts`.

## 설계 (cy4) — 채택 + 기각

- 채택: `lib/auth/guards.ts`에 `PUBLIC_ROUTES`(공개 단일출처) + `app/sitemap.ts`가 이를 `${base}${path==="/"?"":path}`로 매핑. base=`NEXT_PUBLIC_SITE_URL ?? localhost`(env 오버라이드).
- 기각: ① sitemap에 경로 하드코딩 → robots와 드리프트 → PUBLIC_ROUTES 단일출처. ② `lastModified: new Date()` → 빌드마다 변동(비결정) → 생략(선택 필드). ③ 동적 데이터 페이지에 priority 1 → 랜딩만 1, 그외 0.7.

## 갈린 판단 → 택한 기본값 + 이유

- **공개 단일출처 위치**: guards.ts(보호 PROTECTED_PREFIXES 옆) — 두 경계를 한 파일에서 관리, `PUBLIC∩PROTECTED=∅`를 테스트로 못박음.
- **lastModified 생략**: 결정성(빌드 변동·SSG 캐시 안정) > 신선도 메타.
- **base URL**: env 폴백(시크릿 아님), 배포 시 NEXT_PUBLIC_SITE_URL로 실도메인.

## 진행 (cy5)

수정: `lib/auth/guards.ts`(PUBLIC_ROUTES). 신규: `app/sitemap.ts`, `__tests__/sitemap.test.ts`(공개 포함·보호 제외·root=base), `auth-guards.test.ts`에 PUBLIC∩PROTECTED=∅ 추가.

게이트: **typecheck ✓ · vitest 80개(19파일) ✓ · next build 성공 ✓** — `/sitemap.xml`·`/robots.txt` 둘 다 생성.

## 리뷰 (cy6)

**단일 fresh-context 독립 리뷰**: **머지 가능, blocker 0.**
- 경계 정합: PUBLIC_ROUTES 7개 전부 isProtectedPath=false, robots disallow와 교집합 ∅ — sitemap 색인/robots 차단 모순 없음. 단일출처 공유 구조 양호.
- 정확성: 이중슬래시 방지·MetadataRoute 타입·`/sitemap.xml` 생성 확인. any 0, 시크릿 0.

처리(should-fix 1건 반영): base URL 끝 슬래시 미정규화 → `NEXT_PUBLIC_SITE_URL="https://x.com/"`면 `x.com//dashboard` 이중슬래시(Vercel 흔함). → `.replace(/\/+$/, "")`로 정규화 + 회귀 테스트 추가. + 엔트리 수=PUBLIC_ROUTES.length·메타필드 테스트 보강(82개).
후속(범위 외): robots disallow 슬래시 표기 비일관(기능 무관), SEO 콘텐츠 페이지 추가 시 PUBLIC_ROUTES에 합류.

## 상태

**그린** — typecheck ✓ · vitest 82개(19파일) ✓ · next build 성공 ✓(`/sitemap.xml`·`/robots.txt`). blocker 0. 커밋 가능.
