import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ErrorBoundary from "@/app/error";

// error.tsx 는 useEffect 에서 console.error 로 로그 — 테스트 출력 오염 방지 + 호출 검증.
let spy: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  spy = vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => spy.mockRestore());

describe("error 경계", () => {
  it("차분한 안내 + 다시 시도/대시보드 복구 경로를 보여준다", () => {
    render(<ErrorBoundary error={new Error("boom")} reset={() => {}} />);
    expect(screen.getByText("잠시 문제가 생겼어요")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "다시 시도" })).toBeInTheDocument();
    expect(screen.getByText("대시보드로").closest("a")).toHaveAttribute(
      "href",
      "/dashboard",
    );
  });

  it("'다시 시도'가 reset 을 호출한다", () => {
    const reset = vi.fn();
    render(<ErrorBoundary error={new Error("boom")} reset={reset} />);
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("오류를 콘솔에 로그한다(모니터링 지점)", () => {
    const err = new Error("boom");
    render(<ErrorBoundary error={err} reset={() => {}} />);
    expect(spy).toHaveBeenCalledWith(err);
  });
});
