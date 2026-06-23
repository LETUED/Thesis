# 사이클 기록 — 백엔드 API 라우트 스모크 테스트

- **작업**: TestClient로 핵심 엔드포인트의 HTTP 계약(익명→free·tier 게이팅·502 graceful)을 처음으로 검증 — 프론트 게스트 모드가 의존하는 계약
- **브랜치**: `refactor/master-plan`
- **날짜**: 2026-06-24
- **모드**: ultracode, 연속 사이클(자동커밋). 백엔드 엔진테스트(eae5f63)·sitemap(2077dd5) 후속.

---

## 조사 (cy1)

엔진은 직전 사이클로 커버됐으나 **라우트(HTTP 계약)는 테스트 0**. 무가입 게스트 9사이클이 "백엔드 익명→free graceful"에 의존하는데 그 계약이 미검증. routes.py: `/regime`·`/allocation`·`/indicators`가 `Depends(get_user_tier)`(익명→FREE)·`Depends(get_collector)`·`run_in_threadpool(collect_all)`. `_mask_snapshot_for_free`로 free 마스킹. 에러는 502 ErrorResponse.

범위 가설: TestClient 스모크 테스트, collect_all monkeypatch로 네트워크 격리.

## 검색 (cy2)

- **재사용**: `create_app()`, `TestClient`(httpx), `test_threshold_status`의 합성 TickerMetric/MarketSnapshot, `EvidenceLocked.locked`(Free 판별)·`RegimeEvidence.score`(PRO 판별).
- **새로 만듦**: `tests/test_routes.py`.

## 설계 (cy4) — 채택 + 기각

- 채택: `monkeypatch app.api.routes.collect_all`(autouse)→합성 스냅샷으로 네트워크 차단. 익명은 토큰 미전송→`get_user_tier`가 verify_token 없이 FREE 자연 도출. PRO는 `dependency_overrides[get_user_tier]`.
- 기각: ① 캐시 사전시드로 collect_all 우회 → 내부 캐시 키/freshness 의존 fragile → 모듈심볼 monkeypatch가 명확. ② get_current_user/verify_token mock → 익명은 헤더 없으면 자연 None이라 불필요. ③ 실 collect_all(yfinance) → 네트워크·플레이키 → 금지.

## 갈린 판단 → 택한 기본값 + 이유

- **네트워크 격리 방식**: 라우트가 import한 모듈심볼(`routes_mod.collect_all`) monkeypatch — `_snapshot`이 호출 시점에 모듈 전역을 보므로 정확히 가로채짐.
- **익명→free 검증**: 토큰 미전송으로 실제 익명 경로(verify_token 미호출) 그대로 — mock 없이 진짜 계약 검증.
- **502**: 성공 autouse 스텁을 테스트 내 monkeypatch로 raise 덮어쓰기(동일 function-scoped monkeypatch, 마지막 setattr 우선).

## 진행 (cy5)

신규: `tests/test_routes.py`(health·익명 free·locked·allocation free 합100·indicators 마스킹·PRO override·502 graceful). 프로덕션 코드 변경 0.

게이트: **`.venv pytest` 63개 통과**(기존 57 + 신규 6). (httpx testclient deprecation 경고는 라이브러리 소관·무해.)

## 리뷰 (cy6)

**단일 fresh-context 독립 리뷰**(직접 pytest 실행, 63→64 통과·1.46초=네트워크 0 입증): **머지 가능, blocker 0.**
- 계약 유효성: monkeypatch가 `routes_mod.collect_all`(from-import 바인딩)을 정확히 가로채고, snapshot_to_readings→classify_regime→compute_allocation→마스킹은 실코드 실행(스텁 아님). 익명→free 가 verify_token 미호출(네트워크 0)로 자연 성립함을 검증. 클라이언트 tier 위조 방어(body.tier 무시) 확인.
- 경계 명시: PRO는 dependency_overrides 주입이라 "실 인증 체인(verify_token→fetch_tier→Pro)"은 미보증 — 그건 E2E 인증 테스트(미완) 몫. 표시 게이팅 로직은 보증.

처리(should-fix 2건 반영):
- 합성 스냅샷이 VIX 1종→coverage<0.5→가드로 빠져 실제 스코어 경로 미검증 → 규칙 4종(가중 0.59)으로 enrich해 coverage 가드 우회(snapshot_to_readings가 latest=None 제외하므로 momentum 규칙도 latest 채움).
- `/allocation` 502 graceful 케이스 추가.

## 상태

**그린** — `.venv pytest` **64개 통과**(기존 57 + 신규 7). 프로덕션 코드 무변경. blocker 0. 커밋 가능.
