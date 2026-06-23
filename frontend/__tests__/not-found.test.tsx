import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import NotFound from "@/app/not-found";

describe("not-found(404) 경계", () => {
  it("차분한 안내와 돌아갈 길(대시보드·홈) 링크를 보여준다", () => {
    render(<NotFound />);
    expect(screen.getByText("여기엔 페이지가 없어요")).toBeInTheDocument();
    expect(screen.getByText("대시보드로").closest("a")).toHaveAttribute(
      "href",
      "/dashboard",
    );
    expect(screen.getByText("홈으로").closest("a")).toHaveAttribute("href", "/");
  });

  it("단정·권유 문구가 없다(설계철학)", () => {
    const { container } = render(<NotFound />);
    const text = container.textContent ?? "";
    expect(text).not.toContain("사세요");
    expect(text).not.toContain("매수");
  });
});
