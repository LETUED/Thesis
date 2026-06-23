import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PageConclusion } from "@/components/glance/PageConclusion";

describe("PageConclusion — heading 구조", () => {
  it("title 을 문서 최상위 heading(h1)으로 렌더한다", () => {
    render(
      <PageConclusion
        title="② 지표 상세 · 매크로"
        headline="흐름의 방향을 살펴봅니다."
      />,
    );
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1).toHaveTextContent("② 지표 상세 · 매크로");
  });

  it("headline 은 h1 이 아니다(중복 heading 방지)", () => {
    render(<PageConclusion title="제목" headline="평결 한 줄" />);
    // h1 은 정확히 하나, title 텍스트만.
    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent("제목");
  });
});
