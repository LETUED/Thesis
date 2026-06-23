# 사이클 기록 — snapshot_to_readings 단위 테스트 (백엔드 순수함수 커버리지 완결편)

- **작업**: 라우트가 collector 스냅샷을 regime 엔진 입력(`dict[ticker -> IndicatorReading]`)으로 바꾸는 어댑터 `snapshot_to_readings` 의 metric 루프 변환을 단위 테스트
- **브랜치**: `refactor/master-plan`
- **날짜**: 2026-06-24
- **모드**: ultracode, 연속 사이클(자동커밋). 백엔드 테스트 시리즈(엔진 eae5f63·라우트 21e2329·캐시 8601109·추세 cc823e9)의 후속이자 **백엔드 순수함수 커버리지 완결편**.

---

## 조사 (cy1)

`snapshot_to_readings` 정의 위치를 grep으로 특정 → `collector.py:288`(regime.py 가 아니라 collector). 실코드 확인: `snapshot.metrics` 각 `m` 에 대해 `m.status=="failed"` **또는** `m.latest is None` 이면 스킵, 아니면 `IndicatorReading`(ticker/layer/display_name/value=latest/change_pct/asof=fetched_at/is_stale=(status=="stale")/source) 으로 매핑(dict 키=symbol). 이후 `foreign_flow.available AND consecutive_sell_days is not None` 이면 `FOREIGN_NET` 추가. 모델(models.py): `TickerMetric`(status 기본 "ok", source 기본 "yfinance", fetched_at 기본 now_utc), `MarketSnapshot()` 기본 빈 metrics + `ForeignFlowStub(available=False)`, `Layer`={GLOBAL_MACRO,KR_MACRO,RISK_COMMODITY,SECTOR_STOCK}.

범위 가설: 신규 테스트만, 프로덕션 무변경.

## 검색 (cy2) — 중복 가드 발동

- **기존 커버리지 발견**: `test_foreign_flow.py` 가 `snapshot_to_readings` 의 **foreign_flow 분기 2개를 이미 검증** — `test_snapshot_excludes_unavailable_foreign_flow`(available=False 제외), `test_snapshot_includes_available_foreign_flow`(available=True+days=10 포함, value/source 단언).
- **미커버 갭 = 이번 스코프**: (1) **metric 루프 전체**(매핑/failed 스킵/latest=None 스킵/stale flag/필드 패스스루/dict 키/혼합) — 기존 두 테스트는 metric 없이 foreign_flow만 검증, (2) foreign_flow의 **available=True인데 days=None → 제외**(AND 둘째 조건, 기존 미커버).
- **새로 만듦**: `tests/test_snapshot_to_readings.py`(7 테스트).

## 설계 (cy4) — 채택 + 기각

- 채택: 합성 `MarketSnapshot` + `_metric(...)` 헬퍼(status/source/latest 파라미터화). `fetched_at=_DT`(고정 datetime) 주입으로 `asof` 패스스루를 결정적으로 단언. 라벨뿐 아니라 7필드 개별 단언 + 혼합 케이스 `set(readings)` 단언으로 가짜통과(상수/항등 반환) 차단.
- 기각: foreign_flow의 available=False 제외·available=True+days 포함 재작성 — **기존 test_foreign_flow가 이미 커버**(중복 금지). days=None 엣지만 신규로.

## 갈린 판단 → 택한 기본값 + 이유

- **스코프 조정(핵심)**: cy2 중복 가드가 foreign_flow 분기의 기존 커버리지를 잡아냄 → 이번 사이클을 **metric 루프 + days=None 엣지**로 좁혔다. 그대로 8케이스 다 짰으면 2개가 기존과 중복될 뻔했다.
- **`is False`/`is True` 단언**: `IndicatorReading.is_stale` 이 진짜 bool 필드이고 변환식이 `(m.status=="stale")` 이라 동일성 단언이 Pydantic 강제변환에 가려지지 않는 진짜 bool 을 검증.
- **`type: ignore[arg-type]`**: 헬퍼의 `str` 기본 시그니처로 `Literal` 타입 `status`/`source` 를 받기 위한 정당한 억제(`any` 회피 목적).

## 진행 (cy5)

신규: `tests/test_snapshot_to_readings.py`(7 테스트). 프로덕션 코드 변경 0.

게이트: **`.venv\Scripts\python.exe -m pytest` 86개 통과**(기존 79 + 신규 7).

## 리뷰 (cy6)

**단일 fresh-context 독립 리뷰**(게이트 재현 + 기존 테스트 중복 대조): **머지 가능, blocker 0 · should-fix 0.**
- 7분기 모두 실제 경로 자극(OR 양항·AND 둘째항 각각 격리). ok 케이스 7필드 개별 단언 + 혼합 `set` 단언으로 항등/상수 반환 통과 불가.
- **중복 0 확정**: 기존 `test_foreign_flow.py:135/144`는 available=False/available=True+days=10만 커버 → 새 파일의 days=None(둘째 AND 항)·metric 루프 전체는 전부 신규.
- 네트워크/시크릿/`any` 0. `type: ignore[arg-type]`는 정당.
- nice-to-have(source="stub"/layer 다양성)는 단순 패스스루라 저실익 → **비권장**(리뷰어 명시) → 변경 없음.

## 상태

**그린** — `.venv\Scripts\python.exe -m pytest` **86개 통과**(기존 79 + 신규 7). 프로덕션 코드 무변경. blocker 0. 커밋 가능.

**백엔드 순수함수 커버리지 완결**: regime · allocation · threshold_status · foreign_flow · cache(TTL) · compute_trend · snapshot_to_readings 전부 단위 테스트 보유. 남은 백엔드 코드는 네트워크 I/O(collect_all/collect_one·yfinance·DART·pykrx·supabase_admin·stripe)라 단위 테스트보다 통합/E2E 영역 → 사용자 환경에서의 머지·E2E 인계가 다음 단계.
