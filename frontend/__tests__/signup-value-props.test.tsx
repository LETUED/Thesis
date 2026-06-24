import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SignupValueProps } from "@/components/auth/SignupValueProps";

// cycle_3 / 03 — 게스트가 결론을 본 뒤 가입 결정 시 '무엇이 펼쳐지는지' 동기 제공.
describe("가입 가치 제안 (cycle_3 / 03)", () => {
  it("게스트에게 가입 시 펼쳐지는 가치 3가지를 노출한다", () => {
    render(<SignupValueProps />);
    expect(screen.getByText("근거까지 펼쳐보기")).toBeTruthy();
    expect(screen.getByText("더 자주 갱신되는 지표")).toBeTruthy();
    expect(screen.getByText("내 자산배분 추적")).toBeTruthy();
  });

  it("'실시간' 같은 과장 없이 정직한 갱신 주기를 쓴다 (설계철학)", () => {
    render(<SignupValueProps />);
    expect(screen.getByText(/30분 주기로 추적/)).toBeTruthy();
    expect(screen.queryByText(/실시간/)).toBeNull();
  });
});
