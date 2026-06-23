import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import type { Company } from "@/lib/lab/data";
import { buildScreenerRows } from "@/lib/screener/screen";

// WatchlistButton 은 Supabase/결제 모듈에 의존 — 스크리너 표시층 회귀만 보려고 stub 처리.
vi.mock("@/components/personalization/WatchlistButton", () => ({
  WatchlistButton: () => null,
}));

import { ScreenerBoard } from "@/components/screener/ScreenerBoard";

const COMPANY: Company = {
  id: "TST",
  name: "테스트사",
  ticker: "TST",
  yahoo: "TST",
  exchange: "X",
  country: "US",
  forwardPer: 10,
  roe: 33.3, // 기본 정렬(roe) display = "33.3%"
  opMargin: 25,
  revenueGrowth: 30,
  netMargin: 12,
  pbr: 2,
  debtToEquity: 50,
  dividendYield: 1,
};

describe("ScreenerBoard — Free 수치 비노출 회귀", () => {
  it("Free 행(displays=null)은 raw 수치를 렌더하지 않고 잠금 표시를 쓴다", () => {
    const rows = buildScreenerRows([COMPANY], false);
    const { container } = render(<ScreenerBoard rows={rows} tier="free" />);
    const text = container.textContent ?? "";
    expect(text).not.toContain("33.3%"); // roe 정렬값 raw 누출 금지
    expect(text).toContain("Pro 플랜 잠금"); // LockedValue 사용 확인
  });

  it("Pro 행(displays 보유)은 정렬 기준의 raw 수치를 노출한다", () => {
    const rows = buildScreenerRows([COMPANY], true);
    const { container } = render(<ScreenerBoard rows={rows} tier="pro" />);
    const text = container.textContent ?? "";
    expect(text).toContain("33.3%"); // roe 정렬값 노출
    expect(text).not.toContain("Pro 플랜 잠금");
  });
});
