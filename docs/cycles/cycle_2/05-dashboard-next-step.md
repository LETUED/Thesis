# 05 · dashboard 다음 단계 안내 (dashboard-next-step)

- **작업**: dashboard(Top-Down 흐름 시작점)에 `NextStep` 추가 — 입문자가 결론을 본 뒤 다음 단계(자산배분)로 자연히 이어가게. 흐름 안내 공백 메움.
- **브랜치**: `cycle_2` · **세대·회차**: cycle_2 / 05 (무한모드 5회차, 체크포인트서 "계속" 선택)

## ★ 사용자-가치
**입문자가 dashboard 결론을 본 뒤 Top-Down 다음 단계로 자연히 이어가게 — 흐름 시작점의 안내 공백을 메움.** (북극성 ② + 설계철학 2 Top-Down)

## 조사 (cy1) · 검색 (cy2)
- **갭**: `NextStep`(단계 안내)이 indicators·allocation엔 있으나 **dashboard(시작점)엔 없음**. GlanceHub 넛지는 점검 톤이지 흐름 안내가 아님. → Top-Down 일관성 공백.
- **재사용**: 기존 `NextStep` 컴포넌트(중복 없음).

## 설계 (cy3·cy4) · 진행 (cy5) — 변경 파일 2
- `frontend/app/dashboard/page.tsx` — 섹션 ④ 후·disclaimer 전에 `NextStep`(next=`/allocation` "자산배분 보기", prev 없음=시작점, 차분한 reason). free 접근 가능한 allocation으로(indicators는 Pro 게이트라 제외).
- `frontend/__tests__/next-step.test.tsx`(신규) — 조건부 렌더 3케이스(next만/빈DOM/prev label 누락 시 숨김).

**검증**: 프론트 **33 passed**(신규 3) · 타입체크 · 빌드 그린.

## 드리프트 점검
- 03·04(신선도) → 05(입문자 흐름/UX) **다른 결** ✅ (체크포인트서 사용자가 "드리프트 회피 새 주제" 의도로 "계속" 선택).

## 리뷰 (cy6) — 위험클래스 아님 → 단일 fresh-context code-reviewer
- **결과**: "머지 가능", 회귀·철학·중복 이상 없음. next=/allocation 판단 타당(indicators는 Pro 게이트라 제외 옳음), reason 차분 톤, prev 없음(시작점) 적절.
- **nit 1 수정**: NextStep 테스트의 "prev label 누락 시 숨김" 케이스가 prevHref조차 안 줘 주석 의도와 어긋남 → `prevHref="/dashboard"` + label 누락 + "←" 부재 단언으로 정정.

## 상태
- ✅ **그린** — 프론트 33/33, 타입체크, 빌드. Top-Down 흐름 시작점 안내 완성.
- **미해결 잔여(이월)**: 부분실패 종합 고지(03~04부터), FreshnessChip 공유 카피.
- **커밋**: 자동 안 함. 01~05 누적을 `/commit` 제안.
