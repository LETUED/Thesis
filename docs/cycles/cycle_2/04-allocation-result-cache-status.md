# 04 · allocation 결론 신선도 근본해결 (allocation-result-cache-status)

- **작업**: `AllocationResult`에 `cache_status` 추가 → 배분 결론 자체의 신선도를 그 결론과 같은 시점으로 정직 표기. 03의 시점 불일치(페이지 로드 시점 ≠ 결론 생성 시점) 근본 해소.
- **브랜치**: `cycle_2` · **세대·회차**: cycle_2 / 04 (무한모드 4회차, 사용자 선택)

## ★ 사용자-가치
**사용자가 본 자산배분 결론의 신선도를 그 결론 자체 기준으로 정직 표기 — 03의 시점 불일치를 근본 해소(철학5).**

## 조사 (cy1) · 검색 (cy2)
- AllocationPanel(client)이 `postAllocation`→`setResult`로 결론 렌더. `AllocationResult`에 cache_status 없음 → 03은 server `regime.cache_status`(페이지 로드 시점)로 칩을 그려 결론과 시점 어긋남.
- **재사용**: `CacheStatus` 타입(models.py:97), regime의 `routes.py:103` 주입 패턴, `FreshnessChip`, `AllocationPanel.result`.

## 설계 (cy3·cy4) — 칩 일원화(Y)
- **03 page 헤더 칩 제거** + AllocationPanel 결론 카드(ConclusionCard)에 `result.cache_status` 칩. → 신선도를 결론에 귀속(시점 정확), 중복 제거.

## 진행 (cy5) — 변경 파일 6
- `backend/app/models.py` — `AllocationResult.cache_status: CacheStatus = "fresh"`
- `backend/app/api/routes.py` — `post_allocation`에서 `result.cache_status = snapshot.cache_status`(regime 패턴)
- `frontend/lib/types.ts` — `AllocationResult.cache_status`
- `frontend/components/AllocationPanel.tsx` — 결론 카드에 `FreshnessChip(result.cache_status)`
- `frontend/app/allocation/page.tsx` — 03 헤더 칩 제거(regime은 tier 도출만, import 정리)
- `backend/tests/test_allocation_freshness.py`(신규) — cache_status 필드 + **라우터 주입(monkeypatch)** 검증

**검증**: backend pytest **29 passed** · 프론트 **30 passed** · 타입체크 · 빌드 그린.

## 갈린 판단 (택한 기본값 + 이유)
- **칩 위치**: 03 헤더 칩 유지(Z, 중복) vs 결론 카드 일원화(Y) → **Y**. allocation의 본질은 배분 결론이고 신선도는 결론에 귀속이 정확. 헤더 regime 칩은 다른 데이터 신선도라 혼란 → 제거.

## 리뷰 (cy6) — 위험클래스 아님(cache_status는 free) → 2렌즈
- **회귀 렌즈**: 발견 없음(주입 정확, import 정리 완전, 01/03 변경 유지, result 렌더 보존).
- **정확성 렌즈**: medium 1 — **라우터 주입 미검증**(엔진만 테스트 → routes.py:137 삭제해도 통과). → **즉시 수정**: `_snapshot` monkeypatch로 stale 주입 경로 검증(네트워크 없이). low #2(엔진 fresh 함정)는 이 테스트가 불변식 고정 → 자연 방어.
- **재검증**: backend 29 passed.

## 상태
- ✅ **그린** — backend 29/29, 프론트 30/30, 타입체크, 빌드. 03 시점 불일치 근본 해소. 위험클래스 아님(노출 0).
- **미해결 잔여(다음 후보)**:
  - (관찰) 부분실패 종합 고지(`partial`/`failed_symbols` 미가시화) — 03부터 이월
  - (관찰) `FreshnessChip`이 3페이지 공유 — 향후 카피 변경 시 일관 영향
- **커밋**: 자동 안 함. 01~04 누적을 마지막에 `/commit` 제안.
