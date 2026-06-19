# THESIS

투자 판단의 근거를 제공하는 SaaS — 매크로 국면 → 자산배분 → 기업분석을 하나의 흐름으로.

- `backend/` — FastAPI. 16티커 수집(yfinance), 국면 판정, 자산배분, Supabase 인증/Pro 게이팅, Stripe 구독.
- `frontend/` — Next.js 14 (App Router, TS, Tailwind). 로그인/대시보드/결제.
- `backend/supabase/migrations/` — DB 스키마(SQL editor 에 적용).

설계 철학·MVP 단계·임계값은 [`CLAUDE.md`](./CLAUDE.md) 참고.

## 로컬 실행 — 한 번에 켜고/끄기

백엔드 + 프론트 + `stripe listen` 세 개를 한 명령으로 띄운다. **Stripe webhook 시크릿(whsec)은
자동으로 `backend/.env` 에 주입**된다.

```powershell
# PowerShell (권장)
pwsh -ExecutionPolicy Bypass -File .\dev.ps1 up       # 기동
pwsh -ExecutionPolicy Bypass -File .\dev.ps1 status   # 상태
pwsh -ExecutionPolicy Bypass -File .\dev.ps1 down     # 종료
pwsh -ExecutionPolicy Bypass -File .\dev.ps1 restart  # 재시작
pwsh -ExecutionPolicy Bypass -File .\dev.ps1 logs     # 로그 꼬리
```

`Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` 를 한 번 실행해두면 그냥 `.\dev.ps1 up` 으로도 된다.
cmd 터미널에선 `dev.cmd up` / `dev.cmd down` 도 가능.

- 프론트: http://localhost:3000
- 백엔드 API 문서: http://localhost:8000/docs
- 로그: `.tools/logs/`

### 사전 준비(최초 1회)
```powershell
# 백엔드 가상환경 + 의존성
cd backend; py -m venv .venv; .\.venv\Scripts\Activate.ps1; pip install -r requirements.txt; cd ..
# 프론트 의존성
cd frontend; npm install; cd ..
# Stripe CLI 는 .tools/stripe/stripe.exe 에 설치돼 있어야 함(런처가 자동 사용)
```

`backend/.env`, `frontend/.env.local` 에 Supabase/Stripe 키가 필요하다(둘 다 gitignore 처리).

### 수동 실행(런처 없이, 터미널 3개)
```
# 1  cd backend && .venv\Scripts\uvicorn app.main:app --reload
# 2  cd frontend && npm run dev
# 3  .tools\stripe\stripe.exe listen --api-key <sk_test_...> --forward-to localhost:8000/api/stripe/webhook
#    → 출력된 whsec_ 를 backend/.env 의 STRIPE_WEBHOOK_SECRET 에 넣고 백엔드 재시작
```

## 테스트 결제(Stripe 테스트 모드)
대시보드에서 업그레이드 → 카드 `4242 4242 4242 4242`, 만료 미래, CVC 아무 3자리.
구독 취소는 다음 결제일에 반영(cancel_at_period_end).

> 데모 계정: `demo@thesis-test.dev` / `Thesis-demo-1234` (테스트용, 현재 Pro 구독 상태)
