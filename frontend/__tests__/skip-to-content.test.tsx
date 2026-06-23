import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SkipToContent } from "@/components/a11y/SkipToContent";

describe("SkipToContent — 본문 바로가기(skip-link)", () => {
  it("#main 으로 가는 링크와 라벨을 제공한다", () => {
    render(<SkipToContent />);
    const link = screen.getByText("본문으로 건너뛰기");
    expect(link.tagName).toBe("A");
    expect(link).toHaveAttribute("href", "#main");
  });

  it("평소엔 sr-only(시각적으로 숨김), 포커스 시 노출된다", () => {
    render(<SkipToContent />);
    const link = screen.getByText("본문으로 건너뛰기");
    // 기본 sr-only + 포커스 시 not-sr-only 로 드러나는 패턴
    expect(link.className).toContain("sr-only");
    expect(link.className).toContain("focus:not-sr-only");
  });
});
