import { describe, it, expect, beforeAll } from "vitest";
import { render } from "@testing-library/react";
import { AllocationDonut } from "@/components/AllocationDonut";

// recharts ResponsiveContainer 가 jsdom 에 없는 ResizeObserver 를 참조 → 테스트용 stub.
beforeAll(() => {
  globalThis.ResizeObserver =
    globalThis.ResizeObserver ||
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
});

// 결론 스크린리더 접근성(a11y): 도넛 중앙의 성향 라벨(centerText)이 시각에만 보이고
// aria-label 에서 누락되면 스크린리더 사용자는 핵심 결론(성향)을 못 듣는다. 포함을 보장한다.

describe("AllocationDonut — a11y 중앙 라벨", () => {
  it("도넛 aria-label 에 중앙 성향 텍스트가 포함된다", () => {
    const { getByRole } = render(
      <AllocationDonut
        mix={{ stocks_pct: 60, cash_pct: 20, safe_pct: 20 }}
        centerText="성장 추구형"
      />,
    );
    const img = getByRole("img");
    const label = img.getAttribute("aria-label") ?? "";
    expect(label).toContain("성장 추구형"); // 중앙 라벨
    expect(label).toContain("주식 60퍼센트"); // 기존 비율도 유지
  });
});
