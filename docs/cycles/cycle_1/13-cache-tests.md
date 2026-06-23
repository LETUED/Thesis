# 사이클 기록 — InMemoryTTLCache 단위 테스트

- **작업**: 모든 API 엔드포인트가 공유하는 캐시(InMemoryTTLCache)의 fresh/stale/만료/TTL 로직 단위 테스트 — 핵심 인프라 커버리지
- **브랜치**: `refactor/master-plan`
- **날짜**: 2026-06-24
- **모드**: ultracode, 연속 사이클(자동커밋). 백엔드 테스트(엔진 eae5f63·라우트 21e2329)의 후속.

---

## 조사 (cy1)

`collector.py`의 `InMemoryTTLCache`(모든 라우트가 `get_collector`로 주입받아 공유)가 미검증. API: `get`(`time.monotonic() >= expires_at`이면 None), `set(key,val,ttl_sec=None)`(`monotonic()+ttl` 저장, None→default_ttl_sec), `get_stale`(만료 무관 마지막 값). 시간 소스 `time.monotonic()`.

범위 가설: TTL 계약 단위 테스트.

## 검색 (cy2)

- **재사용**: 기존 pytest 패턴(직접 import·격리·합성 모델), `MarketSnapshot()` 빈 생성.
- **새로 만듦**: `tests/test_cache.py`.

## 설계 (cy4) — 채택 + 기각

- 채택: **시간 mock 없이 ttl_sec 부호로 결정성 확보** — `ttl_sec=100`(미래 만료=fresh), `ttl_sec=-1`(과거 만료=즉시 miss, monotonic 비감소라 set 후 get 시 항상 만료). default TTL은 `InMemoryTTLCache(default_ttl_sec=...)` 주입으로.
- 기각: `monkeypatch app.data.collector.time.monotonic` → time 모듈 전역을 건드려 다른 코드에 영향·취약 → ttl 부호 트릭이 더 깔끔하고 견고.

## 갈린 판단 → 택한 기본값 + 이유

- **시간 제어 방식**: ttl 부호(+100/-1) + default_ttl_sec 주입 — `monotonic` 패치 회피로 플레이키 0·전역 영향 0. monotonic 비감소 성질이 ttl=-1 만료를 보장.

## 진행 (cy5)

신규: `tests/test_cache.py`(fresh 히트·미존재 None·만료 get None+get_stale 마지막값·키 독립·default TTL(None→default, fresh/만료 양쪽)·overwrite). 프로덕션 코드 변경 0.

게이트: **`.venv pytest` 70개 통과**(기존 64 + 신규 6). 캐시 계약 전부 성립(버그 0).

## 리뷰 (cy6)

**단일 fresh-context 독립 리뷰**(직접 pytest 실행, 70 passed): **머지 가능, blocker 0 · should-fix 0.**
- TTL 실검증: ttl=-1이 monotonic 단조성으로 만료 `>=` 분기를 결정적 유발(동어반복 아님), default TTL이 `ttl_sec=None` 경로를 실제로 타고 fresh/만료 양쪽 검증(가짜 통과 배제), `is` 단언이 참조 보존 정확 검증(빈 스냅샷 `==` 함정 회피).
- 플레이키 0(시간 mock 없이 ttl 부호+monotonic 단조성), 네트워크 0, 기존 패턴 일관.
- nice-to-have(ttl=0 경계 명시)는 플레이키 위험 대비 실익 낮아 **보류**(리뷰어 권고) → 변경 없음.

## 상태

**그린** — `.venv\Scripts\python.exe -m pytest` **70개 통과**(기존 64 + 신규 6). 프로덕션 코드 무변경. blocker 0. 커밋 가능.
