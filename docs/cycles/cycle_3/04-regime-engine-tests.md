# cycle_3 / 04 — regime-engine-tests (정비)

- **작업**: regime(국면) 엔진 핵심 로직 단위 테스트 백필 — classify_regime·_resolve_label·_headline
- **브랜치**: cycle_3 / 세대·회차: cycle_3 / 04
- **분류**: **유지보수**(백엔드 테스트 커버리지 — 사용자-가치 회차 아님, 정직 표기)

## ★ v3-② 정비 예산 — cycle_2 정면 대조 (이 회차의 핵심)
- cycle_2 평가의 결정적 약점 = **백엔드 커버리지 백필 0**(v2 가치게이트가 "유지보수=무가치"로 배제 → 무한모드가 정비를 영구 회피).
- v3는 정비를 "다른 종류의 가치(안전성·신뢰성)"로 인정 — ② UI 가치가 regime-page 편중·고갈되자 정비가 가장 정직한 선택. cycle_1의 정당한 엔진 테스트(09)와 동형.
- **즉 v3가 v2의 가장 큰 구조적 결함(유지보수 회피)을 실제로 해소함을 실증.**

## git 자동도출 가치필드
- **touched**: backend/tests/test_regime.py(신규)
- **surface**: `backend` (미접촉 — 완전 다른 결, 편중 해소)
- **net_prod_loc**: 0 (프로덕션 코드 변경 없음 — 순수 정비; 테스트 +94)
- **value_size**: 유지보수

## 조사·검색(cy1·cy2)
- cy1: ② UI 가치가 regime-page 편중·비-regime UI 빈약(login 약함) → 정비가 정직한 가치.
- cy2: classify_regime 직접 테스트 0개(cycle_2 회피). 미커버 Top 3 = (1) score→label 경계+매도금지 (2) coverage 가드 (3) tier 게이팅. 패턴: from __future__·절대 import·parametrize·private 직접 import. 실행: backend/.venv pytest tests.

## 진행(cy5)
- test_regime.py: _resolve_label ±25 경계(parametrize) / _headline 매도금지 불변식 / coverage 가드 / tier 게이팅(FREE EvidenceLocked·PRO RegimeEvidence) / disclaimer.
- 게이트: backend pytest **32 passed**(기존 24 + 신규 8, 회귀 0).

## 리뷰(cy6) — 테스트 위조 감시(정비 회차의 핵심)
- _resolve_label 경계·_headline 매도금지: 변이 실측상 **실효 가드** 인정(cutoff `>=`→`>` 시 실패, "매도" 삽입 시 실패).
- **★ major→처리**: coverage 가드 테스트가 **가짜 가드**였음 — 빈입력{}은 score=0이라 가드를 죽여도(`if False`) 통과(동어반복). cy6가 변이 주입(VIX=40→score-100, 가드 제거 시 RISK_OFF)으로 적발. → **강한신호(VIX=40)+저coverage→NEUTRAL/weak** 케이스로 교체(가드 제거 시 실패하는 실효 가드, PRO evidence 충실성 score≤-90 동시 검증).
- **v3 테스트 위조 감시가 또 작동** — 내가 쓴 약한 테스트를 구조로 적발(cycle_1이 누출을 운으로 잡은 것 대비).

## 외부 감사(v3-⑦) + 잔여
- surface `backend`(미접촉) — 정비 1회(연속 1, 캡 2 이내). value_size 유지보수.
- **잔여(다음 회차 후보)**: minor — FREE locked_summary 의 isdigit 검사가 실제 지표명(예 "S&P500"의 "500")에서 깨질 수 있음(빈입력 한정이라 현재 안전) / _top_drivers free 동인 문구 수치 미노출 미검증.

## 상태
그린(backend pytest 32). 머지 가능 — major(가짜 가드) 처리 완료.
