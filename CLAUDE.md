# THESIS 프로젝트

## 한 줄 정의
매크로 → 자산배분 → 기업분석 흐름을 하나의 플랫폼에서 제공하는 투자 판단 SaaS.

## 현재 MVP 단계
> 이 줄을 직접 수정해서 현재 단계를 관리한다.
**현재: 1·2·3단계 코어 동작 (백엔드+프론트 빌드 통과) → Supabase 마이그레이션 적용·E2E 인증 테스트 남음**

MVP 순서:
- [x] 1단계: Next.js + Supabase 세팅 + 인증 (`frontend/` — @supabase/ssr 로그인/회원가입, 미들웨어 세션가드, 빌드 통과. Supabase 프로젝트 THESIS_SB_1 연결. `backend/supabase/migrations/0001_init.sql` 미적용 상태)
- [x] 2단계: FastAPI — yfinance 수집 + 국면 판단 API (`backend/` — 16티커 수집·국면판정·자산배분, Supabase JWT 인증 게이팅, tier는 서버 profiles에서만 도출, /api/regime·allocation·indicators·health 동작)
- [x] 3단계: 프론트 대시보드 (Free — 국면 신호 카드 + 자산배분 패널/도넛, evidence Pro 잠금, disclaimer 3중 노출)
- [x] 4단계: Stripe 구독 + Pro 게이팅 (테스트 모드 — Checkout/고객포털/webhook 서명검증→profiles.tier 동기화 전체 검증. PG-무관 set_user_tier 로 포트원 후속 연결 대비. 실 브라우저 결제 테스트는 `stripe listen` 필요)
- [ ] 5단계: 종목 스크리너 + 포트폴리오 추적
- [ ] (예정) 한국 결제(포트원) 연결, 외국인수급 실데이터(KRX 계정), SEO 콘텐츠 페이지 광고

## 기술 스택 (변경 금지 — 이미 확정)
| 레이어 | 기술 |
|--------|------|
| 프론트엔드 | Next.js 14 + TypeScript + App Router |
| 스타일 | Tailwind CSS + shadcn/ui |
| 차트 | Recharts + TradingView Lightweight Charts |
| API 서버 | FastAPI (Python 3.13) |
| DB / Auth | Supabase (PostgreSQL + RLS) |
| 결제 | Stripe (구독제 + 웹훅) |
| 데이터 수집 | yfinance + APScheduler |
| 캐시 | Upstash Redis (30분 갱신) |
| 배포 FE | Vercel |
| 배포 BE | Railway 또는 Fly.io |
| 모니터링 | Sentry + PostHog |

## 설계 철학 (Claude의 모든 판단 기준)
1. **"지금 사세요" 금지** — "이런 근거들이 있습니다"로 표현
2. **Top-Down 순서 고정** — 매크로 → 자산배분 → 기업분석
3. **결론 먼저, 근거는 펼쳐보기** — 입문자에게 DXY 수치 직접 노출 금지
4. **감정 언어 사용** — '-20% 빠지면 잠 못 잔다' (표준편차 수치 대신)
5. **과신 방지 문구 필수** — 경고 임계값 도달해도 '매도하세요' 금지
6. **결론 무료, 근거 유료** — 국면 신호(Free) / 지표 상세(Pro)
7. **한국 특화** — 원달러·외국인수급·코스피가 1순위 지표

## 임계값 (하드코딩하지 말고 설정값으로)
- VIX > 25: 위험 / DXY > 105: 경계
- 원달러 > 1,400: 주의 / > 1,500: 위험
- 외국인 10일 연속 순매도: 경고
- 단일 종목 최대 15% / 현금 최소 20%

## 플랜 구조
| 플랜 | 가격 | 핵심 기능 |
|------|------|---------|
| Free | ₩0 | 국면 신호, 기본 지표 3개, 단순 자산배분 |
| Pro | ₩9,900/월 | 실시간 데이터, 기업분석 전체, 포트폴리오 추적 |
| Quant | ₩29,900/월 | Pro + API + 커스텀 스크리너 + 백테스트 |

## 이미 구현된 자산
- `market_monitor.py` — 16개 티커 실시간 수집, 국면 자동 판정, CSV 로그
- 투자 지표 사전 21개 (5개 카테고리)
- AI 반도체 4개사 분석 데이터 (NVDA, AVGO, SK하이닉스, 삼성전자)

## 하지 말 것
- 기술 스택 임의 변경 (Vue, Django, Prisma 등 제안 금지)
- 설계 철학을 어기는 UX 제안 (예: "지금 매수하세요" 버튼)
- 과도한 추상화 — MVP 단계에서 필요한 것만
- 타입 없는 TypeScript (`any` 금지)
- 환경변수 하드코딩

## 디렉토리 구조 (목표)
```
Thesis/
├── frontend/          # Next.js 14
│   ├── app/           # App Router
│   ├── components/
│   └── lib/
├── backend/           # FastAPI
│   ├── api/
│   ├── services/
│   └── market_monitor.py  (기존 파일 이동)
├── docs/              # 기획 문서
└── .claude/
    └── commands/      # 커스텀 명령어
```
