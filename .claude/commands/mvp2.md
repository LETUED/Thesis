THESIS MVP 2단계를 시작한다.

목표: FastAPI로 market_monitor.py를 감싸서 API 서버 구축

현재 상태: $ARGUMENTS

구현할 엔드포인트:
- GET /api/v1/market/status — 현재 국면 판정 (리스크온/중립/리스크오프)
- GET /api/v1/market/tickers — 16개 티커 현재값
- GET /api/v1/market/alerts — 임계값 초과 경고 목록
- GET /health — 헬스체크

제약 조건:
- market_monitor.py 로직을 service 레이어로 분리 (파일 직접 수정 금지)
- 30분 캐시 (Redis 없으면 인메모리 fallback)
- 응답은 항상 { data, meta: { cached_at, next_refresh } } 형태
- CORS: Vercel 도메인 + localhost 허용
- VIX>25, DXY>105, 원달러>1400 임계값은 설정 파일로 분리

먼저 계획만 제시하고 구현하지 말 것.
