// 기초 종목 스크리너 — 순수 로직(React·네트워크 없음, 단위 테스트 대상).
// 임계값·tone 은 lib/lab/data.ts BLOCKS 단일출처를 재사용한다(매직넘버 금지).
//
// 보안/설계철학 경계(중요): 결론(등급·순위)은 Free, raw 수치는 Pro.
// 서버 컴포넌트가 클라이언트로 넘기는 prop 은 RSC payload 로 직렬화되어 브라우저에 그대로
// 도착하므로, raw 수치를 그대로 넘기면 Free 에서도 페이지 소스로 누출된다. 따라서
// buildScreenerRows 가 tier(includeValues)에 따라 표시 문자열을 '아예 담지 않는' 안전 DTO 를
// 만들고, 클라이언트는 tone(결론)만으로 필터/정렬한다(raw 수치 없이).

import { getBlock, type Company, type MetricResult, type Tone } from "@/lib/lab/data";

// 기초 스크리너 기준 — BLOCKS 중 Free 등급 차원만(pro 블록 peg/score 제외).
export const SCREENER_CRITERIA = [
  "roe",
  "opMargin",
  "growth",
  "per",
  "debtToEquity",
] as const;
export type ScreenerCriterionId = (typeof SCREENER_CRITERIA)[number];

// 클라이언트로 넘기는 안전 등급 — tone(결론)만. raw value/display 없음.
export interface SafeGrade {
  id: ScreenerCriterionId;
  tone: Tone;
}

// 클라이언트로 넘기는 안전 행. displays 는 Pro 일 때만 채워지고 Free 는 null(수치 미직렬화).
export interface ScreenerRow {
  id: string;
  name: string;
  ticker: string;
  exchange: string | null;
  grades: SafeGrade[];
  goodCount: number;
  watchCount: number;
  displays: Partial<Record<ScreenerCriterionId, string>> | null;
}

export interface ScreenOptions {
  required: ScreenerCriterionId[]; // 통과를 요구할 기준(빈 배열 = 필터 없음)
  sortBy: ScreenerCriterionId; // 정렬 기준
}

interface CriterionGrade {
  id: ScreenerCriterionId;
  result: MetricResult;
}

// 기업별 기준 등급 계산(SCREENER_CRITERIA 전체) — 서버 전용(raw 포함).
function gradesFor(company: Company): CriterionGrade[] {
  return SCREENER_CRITERIA.map((id): CriterionGrade | null => {
    const block = getBlock(id);
    if (!block) return null;
    return { id, result: block.compute(company) };
  }).filter((g): g is CriterionGrade => g !== null);
}

// 서버에서 Company[] → 안전 행[]. includeValues=true(Pro)면 표시 문자열을 담고,
// false(Free)면 displays=null 로 두어 raw 수치가 RSC payload 에 들어가지 않게 한다.
export function buildScreenerRows(
  companies: Company[],
  includeValues: boolean,
): ScreenerRow[] {
  return companies.map((c): ScreenerRow => {
    const grades = gradesFor(c);
    let displays: Partial<Record<ScreenerCriterionId, string>> | null = null;
    if (includeValues) {
      displays = {};
      for (const g of grades) displays[g.id] = g.result.display;
    }
    return {
      id: c.id,
      name: c.name,
      ticker: c.ticker,
      exchange: c.exchange ?? null,
      grades: grades.map((g) => ({ id: g.id, tone: g.result.tone })),
      goodCount: grades.filter((g) => g.result.tone === "good").length,
      watchCount: grades.filter((g) => g.result.tone === "watch").length,
      displays,
    };
  });
}

// 정렬 우선순위 — 양호한 결론이 위로. 색이 아니라 의미(결론 강도)로 정렬한다.
const TONE_RANK: Record<Tone, number> = { good: 2, neutral: 1, watch: 0 };

function toneOf(row: ScreenerRow, id: ScreenerCriterionId): Tone {
  return row.grades.find((g) => g.id === id)?.tone ?? "neutral";
}

// 한 기준 통과 = 해당 기준의 등급이 "good"(데이터 없음/미달은 통과 아님 — 정직 표기).
export function passesCriterion(row: ScreenerRow, id: ScreenerCriterionId): boolean {
  return toneOf(row, id) === "good";
}

// 클라이언트·테스트 공용 순수 필터+정렬(raw 수치 없이 tone 결론만 사용).
// 1순위: 정렬 기준의 등급 강도 → 2순위: 전반적 양호 개수 → 3순위: 이름(ko, 결정성).
export function applyScreen(rows: ScreenerRow[], opts: ScreenOptions): ScreenerRow[] {
  return rows
    .filter((r) => opts.required.every((id) => passesCriterion(r, id)))
    .sort((a, b) => {
      const ra = TONE_RANK[toneOf(a, opts.sortBy)];
      const rb = TONE_RANK[toneOf(b, opts.sortBy)];
      if (ra !== rb) return rb - ra;
      if (a.goodCount !== b.goodCount) return b.goodCount - a.goodCount;
      return a.name.localeCompare(b.name, "ko");
    });
}
