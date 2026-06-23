import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// 검색 API 를 즉시 1건 resolve 로 스텁 — 디바운스 후 결과/지우기 버튼이 노출되게 한다.
vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    searchCompaniesApi: vi.fn(async () => [
      { id: "TST", name: "테스트사", ticker: "TST", exchange: "X", country: "US" },
    ]),
  };
});

import { CompanyLookup } from "@/components/company/CompanyLookup";

describe("CompanyLookup — 키보드 포커스 가시성", () => {
  it("검색 입력 컨테이너가 포커스 시 링(focus-within)을 보인다", () => {
    render(<CompanyLookup tier="free" zeroState={<div>zero</div>} />);
    expect(screen.getByLabelText("기업 검색").parentElement?.className).toContain(
      "focus-within:ring-2",
    );
  });

  it("검색 후 노출되는 지우기·결과 버튼이 focus-visible 링을 갖는다", async () => {
    render(<CompanyLookup tier="free" zeroState={<div>zero</div>} />);
    fireEvent.change(screen.getByLabelText("기업 검색"), {
      target: { value: "테스트" },
    });

    // 디바운스(220ms) + 검색 resolve 후 지우기/결과 버튼 노출 — findBy 로 폴링 대기.
    const clear = await screen.findByLabelText("검색어 지우기");
    expect(clear.className).toContain("focus-visible:ring-2");

    const result = (await screen.findByText("테스트사")).closest("button");
    expect(result?.className).toContain("focus-visible:ring-2");
  });
});
