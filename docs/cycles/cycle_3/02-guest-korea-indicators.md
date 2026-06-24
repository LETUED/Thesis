# cycle_3 / 02 — guest-korea-indicators

- **작업**: 게스트 `/regime`에 한국 1순위 지표(원달러·코스피·변동성) 상태 맛보기 추가 + 랜딩 FinalCta 동선 정합
- **브랜치**: cycle_3
- **세대·회차**: cycle_3 / 02

## ★ 사용자-가치
게스트가 가입 없이 THESIS 핵심 차별점인 한국 1순위 지표 "상태"(원달러·코스피·변동성)를 봄 — 한국특화 ②(설계철학7) + 결론무료(수치 비노출, 상태/방향만).

## git 자동도출 가치필드 (`git diff --cached` 실측)
- **touched**: app/regime/page.tsx, components/landing/FinalCta.tsx, __tests__/regime-guest.test.tsx
- **surface**: `regime-page`(주) + `landing`(FinalCta)
- **net_prod_loc**: +15 (page +14, FinalCta 0; 테스트 +59 별도)
- **value_size**: 중 (기능=한국지표 게스트 맛보기 새 섹션·새 데이터페치 / LOC는 재사용으로 작음 — 정직 표기)

## ★ v3 게이트 작동 (이 회차에서 관찰된 것)
- **최소산출 임계 발동**: FinalCta href 1줄(/signup→/regime)은 단독 회차 가치 미달 → 독립 회차로 거부, 02(한국지표)에 자투리로 곁들임. **cycle_2였다면 이 1줄을 "동선 가치 회차"로 과대포장했을 지점**(aria-pressed 1줄 독립회차와 동형).
- **드리프트 추적**: surface `regime-page` **2연속**(01·02) 기록 — 3연속 아님(차단 전). 03에서 또 regime-page면 차단 발동 예정.

## 조사(cy1)
랜딩 CTA 동선 불일치(Hero=/regime, FinalCta=/signup 가입강제) + 게스트가 한국 1순위 지표 못 봄. 방향게이트: 직전 surface=regime-page(01, 1연속).

## 검색(cy2)
- **재사용**: KoreaTriadStrip(props {snapshot}, tier 없음, latest 미참조·수치 비노출 — 완벽 적합) · getIndicators("free") 토큰없이(선례 dashboard) · 백엔드 free 마스킹(latest/sma None, threshold_status 유지) · StatusPill.
- **신규**: /regime에 getIndicators 호출 + KoreaTriadStrip 섹션 삽입(소량).
- 외국인 수급은 데이터 미연동("준비중") → KoreaTriadStrip(원달러·코스피·변동성)이 회피.

## 설계(cy4)
- **채택**: getIndicators("free", undefined, token) + Top-Down 위치(국면→한국지표→배분)에 KoreaTriadStrip. FinalCta href 자투리.
- **기각**: KoreaMacroBoard(AlertRuleControl 슬롯이 게스트 부적합) / 외국인 수급(데이터 없음).

## 진행(cy5)
- 변경: 위 touched. 테스트: FinalCta CTA(/regime) + 한국지표 raw 미노출(컴포넌트가 latest 미참조 검증).
- 게이트: typecheck ✓ / vitest 22 ✓ / build ✓.

## 리뷰(cy6) — 노출경계(위험클래스), 단일 집중 리뷰
- v3 규칙은 노출 diff 멀티렌즈 강제이나, **재사용 검증 컴포넌트(KoreaTriadStrip latest 미참조) + 백엔드 마스킹(01에서 멀티렌즈로 동일 메커니즘 검증 완료) + 신규 노출로직 0** → 위험비례로 단일 fresh-context + 노출집중 리뷰. (기계적 멀티렌즈 대비 효율 — 정당화 기록.)
- 결과: 노출경계 누출 벡터 없음(다층 방어) · 정확성 OK(allSettled 인덱스 정합·null 폴백) · **테스트 변이검증으로 실효 가드 확인**(DirectionHint가 값 렌더하도록 변이→테스트 실패). nit(테스트 라벨 01→01·02) 처리.

## 외부 감사(v3-⑦)
- surface `regime-page` **2연속**(01·02) — 3연속 차단 전. **→ 다음 회차(03) cy3 입력: regime-page 선택 시 3연속 차단 → 미접촉 surface 강제.**
- value_size 중·중 — '소' 3연속 아님. 정비 예산: 2회 중 정비 0(5 미달, 강제 전).

## 상태
그린(typecheck · vitest 22 · build). 머지 가능.
