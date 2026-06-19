THESIS FastAPI 엔드포인트를 생성한다.

요청: $ARGUMENTS

생성 기준:
- RESTful 설계, 버전 접두사 /api/v1/
- 응답 형태: { data: ..., meta: { cached_at, plan_required } }
- 인증 필요 시 Supabase JWT 검증 미들웨어 적용
- Pro 전용이면 plan 체크 데코레이터 추가
- 에러 응답: { error: { code, message } } 형태 통일
- Pydantic 모델로 요청/응답 스키마 명시
- docstring 금지, 타입 힌트 필수
