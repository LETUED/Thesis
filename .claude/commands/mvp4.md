THESIS MVP 4단계를 시작한다.

목표: Stripe 구독 연동 + Pro 기능 게이팅

현재 상태: $ARGUMENTS

구현 범위:
1. Stripe 상품 생성 — Pro (₩9,900/월), Quant (₩29,900/월)
2. 결제 플로우 — 체크아웃 → 웹훅 → Supabase user_plan 업데이트
3. 플랜 게이팅 미들웨어 — API 레벨 + UI 레벨 이중 차단
4. 구독 관리 — 업그레이드/다운그레이드/취소

웹훅 이벤트 처리 필수:
- checkout.session.completed
- customer.subscription.updated
- customer.subscription.deleted

제약:
- 웹훅 서명 검증 필수 (raw body)
- 플랜 상태는 Supabase가 단일 소스 (Stripe는 트리거만)
- 실패 시 재시도 로직 포함
- 테스트 모드로 먼저 구현, 프로덕션 키는 별도 환경변수

먼저 계획만 제시하고 구현하지 말 것.
