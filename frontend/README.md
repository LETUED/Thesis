# THESIS Frontend

Next.js 14 (App Router) + TypeScript + Tailwind CSS 기반 THESIS 프론트엔드.

## 설계 철학

- **결론 먼저, 근거는 펼쳐보기**: 결론은 무료, 상세 근거는 Pro 잠금.
- **"지금 사세요" 금지**: 모든 화면은 "이런 근거들이 있습니다" 톤. 매수·매도 권유 금지.
- **과신 방지**: 표준편차·변동성 숫자 직접 노출 금지. confidence는 확률 표현.
- **disclaimer 상시 노출**: 루트 레이아웃 푸터 + 결과 카드 인라인 + 과신방지 배너.
- **한국 특화**: 원달러·외국인수급·코스피 우선.

## 요구 환경

- Node.js 18.18+ (Next.js 14)
- 백엔드 FastAPI (`http://localhost:8000`) 가 함께 실행되어야 합니다.

## 설치 및 실행

```bash
npm install
npm run dev      # http://localhost:3000
```

기타 스크립트:

```bash
npm run build      # 프로덕션 빌드
npm run start      # 프로덕션 서버
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
```

## 환경변수

`.env.local` 에 다음 값을 설정합니다 (`.env.local.example` 참고). `NEXT_PUBLIC_` 접두사가 붙은 값만 브라우저에 노출되므로 시크릿은 절대 넣지 않습니다.

| 변수 | 설명 |
| --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | 백엔드 FastAPI 베이스 URL (예: `http://localhost:8000`) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable(anon) 키 |

> 배포 시 `NEXT_PUBLIC_API_BASE_URL` 을 공개 백엔드 URL로 교체하고, 백엔드 `CORS_ORIGINS` 에 프론트 오리진을 등록해야 합니다.

## 디렉터리 구조 (현재 스캐폴드 단계)

```
app/
  layout.tsx              루트 레이아웃 (한국어, disclaimer 푸터)
  globals.css             Tailwind 베이스 + 레짐 색상 토큰
  login/page.tsx          Supabase 이메일/비번 로그인
  signup/page.tsx         Supabase 회원가입 (이메일 확인 안내)
  auth/callback/route.ts  매직링크/OAuth 콜백 (code → session 교환)
lib/
  supabase/client.ts      브라우저 Supabase 클라이언트
  supabase/server.ts      서버 컴포넌트/Route Handler용 클라이언트
  supabase/middleware.ts  세션 갱신 + 보호 경로 가드 헬퍼
  utils/cn.ts             clsx + tailwind-merge
middleware.ts             Supabase 세션 리프레시 진입점
```

> 대시보드 페이지/컴포넌트(레짐 카드, 자산배분 플래너 등)와 API 클라이언트·타입은 다음 단계에서 추가됩니다.

## 인증

`@supabase/ssr` 기반. `middleware.ts` 가 매 요청마다 세션을 리프레시하고 `/dashboard` 하위 경로를 인증 가드합니다(비로그인 → `/login` 리다이렉트).
