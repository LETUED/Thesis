import { describe, it, expect } from "vitest";
import type { Company } from "@/lib/lab/data";
import {
  buildScreenerRows,
  applyScreen,
  passesCriterion,
} from "@/lib/screener/screen";

// 합성 기업 — BLOCKS 임계값(roe≥15, opMargin≥20, growth≥20, per≤15, 부채≤100)에 맞춰
// 등급(tone)·필터·정렬·수치 비노출을 결정적으로 검증한다(네트워크 없음).
function makeCompany(over: Partial<Company> & { id: string; name: string }): Company {
  return {
    ticker: "TST",
    yahoo: "TST",
    exchange: "X",
    country: "US",
    forwardPer: 10, // good (≤15)
    roe: 33.3, // good (≥15) → display "33.3%"
    opMargin: 25, // good
    revenueGrowth: 30, // good
    netMargin: 12,
    pbr: 2,
    debtToEquity: 50, // good (≤100)
    dividendYield: 1,
    ...over,
  };
}

const A = makeCompany({ id: "A", name: "에이" }); // roe good → 5 good
const B = makeCompany({ id: "B", name: "비", roe: 10 }); // roe watch → 4 good
const C = makeCompany({ id: "C", name: "씨", roe: null }); // roe 데이터없음(neutral) → 4 good

describe("buildScreenerRows — tier 별 수치 노출 경계(누출 방지)", () => {
  it("Free(includeValues=false)는 displays 가 null 이고 raw 수치를 직렬화에 담지 않는다", () => {
    const rows = buildScreenerRows([A, B, C], false);
    for (const r of rows) expect(r.displays).toBeNull();
    // RSC payload 누출 회귀: 직렬화 결과에 raw 재무 수치가 없어야 한다.
    expect(JSON.stringify(rows)).not.toContain("33.3");
    expect(JSON.stringify(rows)).not.toContain("10.0배");
  });

  it("Pro(includeValues=true)는 정렬·표시용 displays 를 담는다", () => {
    const rows = buildScreenerRows([A], true);
    expect(rows[0]!.displays).not.toBeNull();
    expect(rows[0]!.displays?.roe).toBe("33.3%");
    expect(rows[0]!.displays?.per).toBe("10.0배");
  });

  it("등급(tone)과 goodCount 는 양 tier 공통으로 계산된다", () => {
    const [a, b, c] = buildScreenerRows([A, B, C], false);
    expect(a!.goodCount).toBe(5);
    expect(b!.goodCount).toBe(4); // roe watch
    expect(c!.goodCount).toBe(4); // roe neutral(데이터 없음)
    expect(a!.grades.find((g) => g.id === "roe")?.tone).toBe("good");
    expect(b!.grades.find((g) => g.id === "roe")?.tone).toBe("watch");
    expect(c!.grades.find((g) => g.id === "roe")?.tone).toBe("neutral");
  });
});

describe("applyScreen — 필터", () => {
  it("required 기준의 등급이 양호한 종목만 남긴다", () => {
    const rows = buildScreenerRows([A, B, C], false);
    const out = applyScreen(rows, { required: ["roe"], sortBy: "roe" });
    expect(out.map((r) => r.id)).toEqual(["A"]); // B(watch)·C(neutral) 탈락
  });

  it("required 가 비면 전체 통과", () => {
    const rows = buildScreenerRows([A, B, C], false);
    expect(applyScreen(rows, { required: [], sortBy: "roe" })).toHaveLength(3);
  });

  it("여러 기준은 모두(AND) 양호해야 한다", () => {
    const lowPer = makeCompany({ id: "lp", name: "엘", forwardPer: 10 }); // roe·per 양호
    const highPer = makeCompany({ id: "hp", name: "에이치", forwardPer: 25 }); // per 미달
    const rows = buildScreenerRows([lowPer, highPer], false);
    const out = applyScreen(rows, { required: ["roe", "per"], sortBy: "roe" });
    expect(out.map((r) => r.id)).toEqual(["lp"]);
  });
});

describe("applyScreen — 정렬(결론 강도순)", () => {
  it("정렬 기준의 등급이 양호한 종목을 위로(good>neutral>watch)", () => {
    const rows = buildScreenerRows([B, C, A], false); // 입력 순서 섞음
    const out = applyScreen(rows, { required: [], sortBy: "roe" });
    expect(out.map((r) => r.id)).toEqual(["A", "C", "B"]); // good, neutral, watch
  });

  it("정렬 기준 등급이 같으면 goodCount, 그다음 이름으로 안정 정렬", () => {
    // 둘 다 roe good. goodCount 동률이면 이름(ko) 순.
    const x = makeCompany({ id: "x", name: "나" });
    const y = makeCompany({ id: "y", name: "가" });
    const rows = buildScreenerRows([x, y], false);
    const out = applyScreen(rows, { required: [], sortBy: "roe" });
    expect(out.map((r) => r.id)).toEqual(["y", "x"]); // 가 < 나
  });
});

describe("passesCriterion", () => {
  it("등급이 good 일 때만 통과(데이터 없음/미달은 통과 아님)", () => {
    const [a, b, c] = buildScreenerRows([A, B, C], false);
    expect(passesCriterion(a!, "roe")).toBe(true);
    expect(passesCriterion(b!, "roe")).toBe(false); // watch
    expect(passesCriterion(c!, "roe")).toBe(false); // neutral(데이터 없음)
  });
});
