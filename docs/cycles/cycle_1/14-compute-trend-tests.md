# 사이클 기록 — compute_trend 단위 테스트

- **작업**: 단·장기 SMA로 추세 라벨(uptrend/downtrend/sideways/insufficient_data)을 내는 순수함수 `compute_trend` 단위 테스트 — 매 수집에 쓰이나 미검증
- **브랜치**: `refactor/master-plan`
- **날짜**: 2026-06-24
- **모드**: ultracode, 연속 사이클(자동커밋). 백엔드 테스트 시리즈(엔진 eae5f63·라우트 21e2329·캐시 8601109)의 후속.

---

## 조사 (cy1)

`collector.py:96-119` `compute_trend(closes, short=5, long=20) -> TrendInfo` 실코드를 기억과 대조 확인(일치): `clean=[non-None]` → `len<long`이면 `insufficient_data`(sma None) → `sma_short=sum(clean[-5:])/5`, `sma_long=sum(clean[-20:])/20` → `sma_long==0`이면 sideways(sma 세팅) → `spread=(s-l)/abs(l)*100`, strict `>0.5` up·`<-0.5` down·그외 sideways. `TrendInfo`(models.py): `label: TrendLabel`(4값 Literal), `sma5/sma20: float|None=None`.

범위 가설: 신규 `tests/test_compute_trend.py` 단독, 프로덕션 무변경.

## 검색 (cy2)

- **재사용**: 기존 pytest 패턴(`test_cache.py` 스타일 — `from __future__ import annotations`, 직접 import, 격리 함수, 한국어 docstring), 합성 입력.
- **새로 만듦**: `tests/test_compute_trend.py`. 기존 6개 테스트 파일에 trend 커버리지 없음 확인(중복 0).

## 설계 (cy4) — 채택 + 기각

- 채택: **합성 종가 9케이스, 기대 SMA는 dyadic(2진 정확표현) 값만 골라 `==` 단언**. insufficient/uptrend/downtrend/sideways(영·비영spread)/sma_long==0/None필터/None-길이제외/정확성(range 1..20).
- 기각: **정확히 spread==0.5 경계 테스트** — 0.5%=1/200=0.005는 비-dyadic이라 float 정확표현 불가 → knife-edge `==`는 플레이키. 직전 캐시 사이클 리뷰어 권고(저실익·플레이키 보류)와 동일 원칙. 대신 case 5(비-영 spread ≈0.375%, 밴드 안)로 '밴드 폭이 존재함'을 견고하게 대체검증.

## 갈린 판단 → 택한 기본값 + 이유

- **경계 검증 방식**: 정확 0.5% 대신 밴드 내 비-영 spread(case 5)로 — float 표현 한계상 knife-edge가 플레이키해서. case 4(spread=0)만으로는 '밴드를 없애고 부등호만 쓰는' 회귀를 못 잡으니, 비-영이면서 sideways인 case 5가 밴드 폭의 존재를 증명.
- **기대값 단언 방식**: 라벨뿐 아니라 sma5/sma20 수치까지 `==` 단언 — 함수가 상수만 반환하는 식의 가짜통과 차단. 단언값 전부 dyadic이라 `==` 안전.
- **None 검증 분리**: 필터(case 7, 값 제거 후 정상) + 길이제외(case 8, raw 28이지만 clean 18<20→insufficient)로 나눠 'None이 카운트에서 빠짐'을 명시 증명.

## 진행 (cy5)

신규: `tests/test_compute_trend.py`(9 테스트). 프로덕션 코드 변경 0.

게이트: **`.venv\Scripts\python.exe -m pytest` 79개 통과**(기존 70 + 신규 9). 추세 로직 전 분기 성립(버그 0).

## 리뷰 (cy6)

**단일 fresh-context 독립 리뷰**(게이트 직접 재현 + 기대값 손계산 교차검증): **머지 가능, blocker 0 · should-fix 0.**
- 9테스트 .venv pytest 통과 재현. 단언 SMA 8종(110.0/102.5/90.0/97.5/100.0/100.5/100.125/0.0/18.0/10.5) 전부 float 정확표현(hex 가수 검증) — 비-dyadic `==` 없음.
- 4라벨 전 분기 + `sma_long==0` 가드 + None 필터/길이제외 경로가 실제로 자극됨. 라벨+수치 동시 단언으로 가짜통과 불가.
- 네트워크/시크릿/`any` 접촉 0. `type: ignore[list-item]`는 None 주입 의도의 정직한 표기로 적절.
- nice-to-have(short/long 커스텀 인자 경로)는 호출자가 디폴트만 쓰고 슬라이스 크기 변경뿐이라 저실익 → **추가 비권장**(리뷰어 명시) → 변경 없음.

## 상태

**그린** — `.venv\Scripts\python.exe -m pytest` **79개 통과**(기존 70 + 신규 9). 프로덕션 코드 무변경. blocker 0. 커밋 가능.
