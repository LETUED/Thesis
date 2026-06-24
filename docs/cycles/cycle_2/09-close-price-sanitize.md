# 09 · 종가 이상치 정제 (close-price-sanitize)

- **작업**: yfinance 종가의 음수·0 이상치를 정제. 오염된 시세가 regime 결론까지 전파되는 것을 차단.
- **브랜치**: `cycle_2` · **세대·회차**: cycle_2 / 09 (무한모드 9회차, 자율 — 백엔드 결 전환)

## ★ 사용자-가치
**데이터 소스 오류(음수·0 종가)가 결론을 오염시키지 않게 — 입문자가 잘못된 데이터로 오판하지 않도록 정직성 방어(데이터 신뢰성).**

## 조사 (cy1, Explore 에이전트) — 백엔드 견고, 가치 갭 3
- **견고(갭 없음)**: 에러 폴백 일관(`_error_response` 표준), 외국인수급 stub 정직(available=false·가짜수치 없음), stale/partial 폴백+프론트 고지.
- **가치 갭 3**: ①"30분 주기 갱신" 문구가 자동 갱신 암시(APScheduler 없는 lazy 캐시) ②**음수·0 종가 검증 부재**(NaN만 거름) ③cached/fresh 구분·데이터 나이 불투명.
- **09 선정 = 갭2**(가장 명확·데이터 정직성 핵심·백엔드 결로 드리프트 확실). 갭①③은 10+ 후보.

## 진행 (cy5) — 변경 파일 2
- `backend/app/data/collector.py` — `_sanitize_closes` 헬퍼 분리(NaN+음수+0 제거, 시세 양수 불변식), `_extract_closes`가 사용. 전부 무효면 기존처럼 ValueError→`status='failed'` 표면화. (fundamentals 음수 PER 차단과 일관성 회복)
- `backend/tests/test_collector_sanitize.py`(신규) — NaN/음수/0 제거·전부무효 빈리스트·정상 양수 유지·trend 누출 방지 4케이스

**검증**: backend pytest **33 passed**(신규 4). 순수 함수 — 네트워크 없이 결정론적.

## 드리프트 점검
- 07(용어)·08(a11y) → 09(백엔드 데이터 정직성). **결 전환 성공**(프론트 입문자 친화 8회차 탈피). v2 하네스 드리프트 감지가 결 다양화를 유도.

## 리뷰 (cy6) — 단일 fresh-context
- **결과**: "머지 가능", 차단 0. 회귀(NaN 제거 보존·정상 float 통과)·정확성(양수 불변식 타당·trend 오염 차단)·부작용(과도필터 없음·insufficient_data 안전 폴백)·테스트 충분.
- 사소(낮음, 무영향): `isinstance(int,float)`가 bool 통과 — yfinance Close에 bool 없어 영향 0, 과방어 안 함.

## 상태
- ✅ **그린** — backend 33/33. 시세 양수 불변식 방어. fundamentals와 일관.
- **미해결 잔여(10+ 후보)**: 갭①(FreshnessChip "30분 주기 갱신" 과신 문구→정직화), 갭③(데이터 나이 generated_at 노출), a11y #3·4·5.
- **A/B 메모**: 9회차 무드리프트. 08→09에서 프론트→백엔드 결 전환으로 v2 드리프트 감지 작동 입증.
