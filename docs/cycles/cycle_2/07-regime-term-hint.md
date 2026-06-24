# 07 · 국면 용어 입문자 풀이 (regime-term-hint)

- **작업**: "리스크온/리스크오프" 국면 라벨에 입문자용 한 줄 풀이 병기. 용어를 모르는 입문자 보호.
- **브랜치**: `cycle_2` · **세대·회차**: cycle_2 / 07 (무한모드 7회차, 자율)

## ★ 사용자-가치
**입문자가 '리스크온' 같은 용어를 즉시 이해하도록 풀이를 곁에 병기(②·철학3 입문자 보호).**

## 조사~설계 (cy1~cy4)
- **갭**: 라벨이 GlanceHub 칩에 용어 풀이 없이 노출(RegimeSpectrum만 양끝 병기). headline은 *상황*이지 *용어 뜻*이 아님.
- **재사용**: RegimeSpectrum 양끝 병기 패턴, REGIME_STYLES 구조.
- **드리프트**: 05(흐름)·06(완전성) → 07(용어 이해) **다른 결** ✅.

## 진행 (cy5) — 변경 파일 3
- `frontend/lib/regime.ts` — `REGIME_HINT: Record<RegimeLabel,string>`(라벨→한 줄 풀이, "매도" 금지 톤)
- `frontend/components/glance/GlanceHub.tsx` — label 칩 옆에 풀이 병기(flex-wrap)
- `frontend/__tests__/regime-hint.test.ts`(신규) — 라벨 완전성 + 강요 톤 미포함

**검증**: 프론트 **38 passed**(신규 2) · 타입체크 · 빌드 그린.

## 리뷰 (cy6) — 위험클래스 아님 → 단일 fresh-context
- **결과**: "발견 없음, 머지 가능". 회귀(타입 완전·레이아웃 보존)·철학(비강요 톤·RegimeSpectrum 일관)·단순화 OK.
- **참고(블로킹 아님)**: 풀이가 칩과 별개 span → 스크린리더 분리. aria-label 묶기는 **08 접근성 후보**.

## 상태
- ✅ **그린** — 프론트 38/38, 타입체크, 빌드. 입문자 용어 풀이 GlanceHub 적용.
- **미해결 잔여(08 후보)**: 용어 풀이 aria 묶기(접근성), RegimeSignalCard 등 다른 라벨 노출처 일관 적용.
