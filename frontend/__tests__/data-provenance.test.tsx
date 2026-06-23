import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DataProvenance } from "@/components/ui/data-provenance";

describe("DataProvenance — 신뢰 푸터", () => {
  it("기준 시각과 출처를 함께 노출한다", () => {
    render(
      <DataProvenance generatedAt="2026-06-24T05:30:00Z" source="Yahoo Finance" />,
    );
    expect(screen.getByText(/기준/)).toBeInTheDocument();
    expect(screen.getByText(/14:30/)).toBeInTheDocument();
    expect(screen.getByText("Yahoo Finance")).toBeInTheDocument();
  });

  it("출처만 있으면 출처 칩만 노출(기준 시각 없음)", () => {
    const { container } = render(<DataProvenance source="DART" />);
    expect(screen.getByText("DART")).toBeInTheDocument();
    expect(container.textContent).not.toContain("기준");
  });

  it("둘 다 없으면 아무것도 렌더하지 않는다", () => {
    const { container } = render(<DataProvenance />);
    expect(container.firstChild).toBeNull();
  });

  it("잘못된 generatedAt만 있으면 렌더하지 않는다(가짜 시각 금지)", () => {
    const { container } = render(<DataProvenance generatedAt="bad-date" />);
    expect(container.firstChild).toBeNull();
  });
});
