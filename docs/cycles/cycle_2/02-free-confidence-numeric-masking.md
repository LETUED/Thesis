# 02 · Free 확신도 원시 수치 마스킹 (free-confidence-numeric-masking)

- **작업**: Free/익명 regime 응답에서 확신도의 원시 수치(`confidence.score` 0~1 + `confidence.rationale` "신호강도 73%…")를 페이로드 단계에서 제거. 입문자에 수치 비노출(설계철학 4) + `_pro` 게이팅 누락 메우기.
- **브랜치**: `cycle_2`
- **세대·회차**: cycle_2 / 02 (무한모드 2회차)

## ★ 사용자-가치
**입문자(Free/익명)가 결론을 볼 때 '신호강도 73%·커버리지 88%' 같은 기술 수치에 위축되지 않는다 — 설계철학 4(수치 비노출)를 페이로드 단계에서 지켜 진입 장벽을 낮춘다.** (북극성 ② + 철학 4·6)

## 조사 (cy1)
- 백엔드가 철학4를 대체로 충실히 구현: `risk_label_text` 감정 문구 5단계(*"-10%만 빠져도 잠을 설칩니다"*), `probabilistic_label` 정성, RegimeSpectrum 정성, MetricCard LockedValue.
- **🔴 갭**: `regime.py classify_regime`이 `conclusion.confidence.rationale`에 *"신호강도 73%, 커버리지 88%, 합의도 65% 종합."* 기술 수치를 **tier 무관**하게 채우고, `get_regime`이 그대로 반환 → Free/익명 `RegimeSignalCard`→`ConfidenceMeter` 노출.
- 근본: `_pro()`/`_free()` 마커는 **OpenAPI 메타일 뿐 자동 직렬화 필터가 아님**(snapshot은 `_mask_snapshot_for_free`로 수동 마스킹). rationale은 `_pro` 마커인데 실제 마스킹 누락 = **cycle_1 RSC 누출과 같은 클래스**.

## 검색 (cy2)
- **재사용**: `classify_regime`의 기존 tier 분기(evidence→EvidenceLocked) 자리, 프론트 `ConfidenceMeter {rationale ? : null}` 가드, `backend/tests/` pytest 구조, `_pro/_free` 마커.
- **갭은 regime 한 곳**: allocation `confidence`는 `Literal["low","moderate","high"]` 정성(rationale 필드 없음) → 안전.
- 마스킹 위치: 엔진(`classify_regime`, evidence 분기와 같은 자리) = 단일 출처.

## 설계 (cy4)
- `classify_regime`에서 `conclusion` 생성 직후 `tier != PRO`면 마스킹 → 정상·커버리지부족 **두 confidence 분기 일괄 처리**.
- 테스트: 빈 dict(커버리지부족) + `_full_readings`(정상 경로) 양쪽.

## 갈린 판단 (택한 기본값 + 이유)
- **`score`(0~1) 처리**: cy1/cy3는 "프론트 미사용 → 스코프 밖(후속)"으로 미뤘으나, **cy6 라운드1 3렌즈가 "rationale의 73%만 막고 종합값 score=0.73을 남기면 마스킹 불완전(같은 클래스)"**으로 지적. → 같은 기능의 **완전화**로 판단해 이번 회차에 포함: `score: float|None`, `_free→_pro`, 마스킹. 프론트 `types.ts score: number|null`(미사용이라 회귀 0).
- **마스킹 위치**: 라우터(`_mask_*`)가 아닌 엔진 — regime은 엔진이 tier를 받으므로 evidence 분기와 한 자리(누락 위험 최소).

## 진행 (cy5) — 변경 파일 4
- `backend/app/engine/regime.py` — `tier != PRO`면 `conclusion.confidence.score = None` + `rationale = None`
- `backend/app/models.py` — `Confidence.score`를 `float|None`·`_pro`로 재분류 + `_pro` 정의에 **마스킹 두 지점 점검 규약 주석**(회귀 재발 방지)
- `frontend/lib/types.ts` — `Confidence.score: number | null`
- `backend/tests/test_regime_free_masking.py`(신규) — 커버리지부족·정상 두 경로 × Free(None)/Pro(보존), 정상경로는 `신호강도`/`합의도` 고유 토큰으로 고정

**검증**: backend pytest **26 passed**(신규 6, 회귀 0) · 프론트 typecheck 클린 · 빌드 그린 · 마스킹 실증(FREE score/rationale=None, PRO 보존, probabilistic_label 유지).

## 리뷰 (cy6) — 위험클래스(Free/Pro 노출) 멀티렌즈
- **라운드1 (Workflow 3렌즈: 노출완전성·회귀·정확성)**: 전원 "머지 가능". 발견 medium 2 → **즉시 수정**: ①score 노출(완전 마스킹) ②테스트 사각지대(정상 경로 미검증·Pro `'%'` 우연통과) → 정상경로 케이스 + 고유 토큰 단언 추가.
- **라운드2 (Workflow 2렌즈: 노출완전성·회귀+테스트)**: 전원 "머지 가능", 차단 0. Free Confidence는 level/probabilistic_label만 노출(score/rationale null 확인), score 의존처 0(백/프론트), 정상경로 테스트 실효 확인. 새 발견 전부 nit/low.
  - **반영**: #1(마스킹 엔진·라우터 분산 → 재발 위험) → `_pro` 정의에 **점검 규약 주석**(비코드, 재발 방지).

## 상태
- ✅ **그린** — pytest 26/26, 타입체크, 빌드 통과. 독립 멀티렌즈(3+2렌즈) 통과. Pro 후퇴 0, 회귀 0.
- **미해결 잔여(03회차 후보)**:
  - (nit) 마스킹 로직이 엔진(regime)·라우터(snapshot) 두 지점 분산 — 주석 규약으로 완화했으나 구조적 단일화는 미해결
  - (관찰) `types.ts confidence.score`는 현재 죽은 필드(프론트 미사용) — 사용처 생기면 null 가드 필요
- **커밋**: 자동 안 함. 01·02회차 누적 변경(backend 4 + frontend 10 + docs)을 마지막에 `/commit` 제안.
