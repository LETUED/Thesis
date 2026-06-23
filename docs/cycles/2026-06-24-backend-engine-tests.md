# 사이클 기록 — 백엔드 분석 엔진 테스트 보강

- **작업**: 분석 코어(regime·allocation)가 테스트 2개뿐 → 핵심 분기·불변식 단위 테스트 추가(제품 심장부 + 자율 루프 오라클 강화)
- **브랜치**: `refactor/master-plan`
- **날짜**: 2026-06-24
- **모드**: ultracode, 연속 사이클(자동커밋). 프론트 9사이클에 이은 **첫 백엔드 사이클**.

---

## 조사 (cy1)

- **pytest 환경**: 전역 `py`엔 pytest 없음 → 백엔드는 `.venv` 사용. 게이트 = `.venv\Scripts\python.exe -m pytest`(기존 20개 통과 확인).
- **커버리지 갭**: `engine/thresholds.classify_threshold`는 기존 `test_threshold_status`로 양방향 커버됨. 반면 **`regime.classify_regime`·`allocation.compute_allocation`·`validate_single_position`은 직접 테스트 0**(데이터 파이프라인 외 핵심 로직).
- config(`RegimeConfig` cutoff ±25·min_coverage 0.5·9규칙 calm+danger / `AllocationConfig` min_cash 20·single 15·matrix·tilt +8/0/−12) 확인 → 결정적 입력 구성 가능.

범위 가설: regime·allocation 두 엔진의 계약·불변식 테스트.

## 검색 (cy2)

- **재사용**: 기존 `test_threshold_status` 패턴(직접 import·`settings` 주입·합성 모델·네트워크 0), config 단일 출처.
- **새로 만듦**: `tests/test_regime.py`, `tests/test_allocation.py`.

## 설계 (cy4) — 채택 + 기각

- 채택: 결정적 입력 — regime은 config 규칙을 순회해 calm/danger/mid 값으로 채우는 `_readings_at` 헬퍼(metric별 value/change_pct), allocation은 `_regime(label)`을 models로 직접 구성(엔진 비결합) + `AllocationRequest` enum-by-value. 검증은 **계약·불변식**(라벨·합=100·현금≥20·tier·경계)으로 — fragile한 정확 점수 크래프팅 회피.
- 기각: ① 정확 score 기대값 하드코딩 → config 변하면 깨짐 → 라벨(부호) 수준만. ② allocation 입력을 classify_regime로 생성 → 두 엔진 결합(한쪽 회귀가 양쪽 테스트 오염) → models 직접 구성. ③ 사적 함수(_resolve_label 등) 단위 테스트 → 공개 계약(classify_regime/compute_allocation) 통합 검증이 더 가치.

## 갈린 판단 → 택한 기본값 + 이유

- **계약/불변식 vs 정확값**: 불변식(합=100·현금≥20·라벨 부호·경계) — config 변경에 강건하고 진짜 버그(음수 비중·합 깨짐·매도 단정)를 잡음.
- **게이트 명령**: 전역 `py` 아닌 `.venv` python(pytest 위치). decision log에 명시.
- **버그 발견 시 수정**: 불변식 위반 시 엔진 수정 — 그러나 56개 전부 그린 → 엔진은 해당 불변식 충족(프로덕션 코드 무변경).

## 진행 (cy5)

신규: `tests/test_regime.py`(7케이스), `tests/test_allocation.py`(파라미터라이즈 포함). 프로덕션 코드 변경 0.

게이트: **`.venv pytest` 56개 통과**(기존 20 + 신규 36). 불변식이 외부 오라클로서 전 조합에서 성립.

## 리뷰 (cy6)

**단일 fresh-context 독립 리뷰**(직접 pytest 실행): **머지 가능, blocker 0 · should-fix 0.**
- 유효성(동어반복 아님): 계측으로 calm→score+100/danger→−100/mid→0·coverage 1.0 확인 → 라벨 테스트가 진짜 `_score_indicator→_aggregate_score→_resolve_label` 경로를 탐. `_readings_at`의 metric 분기가 엔진과 일치. min_cash 강제 분기 실제 진입.
- 불변식 의미 있음: 음수 비중·합 붕괴·tilt clamp 사망 케이스 없음(직접 계측). tier 게이팅 양 엔진 정확.
- 결정성: by-value 입력, config 변경에 강건. 네트워크 0, any/하드코딩 0. 36개 직접 실행 통과.

처리(nice-to-have 1건 반영): `test_mid_values_are_neutral`가 mid→0이라 cutoff 경계 자체는 미검증 → `_resolve_label` 직접 호출로 컷오프(±25 at/just-inside) 경계 검증 테스트 추가(라벨 로직 핵심 보강).
후속(범위 외): 공격적 끝단 tilt 단조성(min_cash floor가 상쇄 — 엔진 정상), 라인 길이(cosmetic).

## 상태

**그린** — `.venv\Scripts\python.exe -m pytest` **57개 통과**(기존 20 + 신규 37). 프로덕션 코드 무변경(엔진 버그 0). blocker 0. 커밋 가능.
