import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { GuestActionInvite } from "@/components/personalization/GuestActionInvite";

describe("GuestActionInvite — 게스트 저장 행동 → 로그인 유도", () => {
  it("메시지와 redirectedFrom 을 담은 로그인 링크를 노출한다", () => {
    render(
      <GuestActionInvite
        message="로그인하면 이 설정을 저장해 다시 볼 수 있어요."
        redirectedFrom="/allocation"
      />,
    );
    expect(
      screen.getByText("로그인하면 이 설정을 저장해 다시 볼 수 있어요."),
    ).toBeInTheDocument();
    expect(screen.getByText("로그인").closest("a")).toHaveAttribute(
      "href",
      "/login?redirectedFrom=%2Fallocation",
    );
  });

  it("외부/위험 redirectedFrom 은 안전 폴백(/dashboard)으로 정규화한다", () => {
    render(<GuestActionInvite message="x" redirectedFrom="https://evil.com" />);
    expect(screen.getByText("로그인").closest("a")).toHaveAttribute(
      "href",
      "/login?redirectedFrom=%2Fdashboard",
    );
  });

  it("강요·매수 권유 문구가 없다(설계철학)", () => {
    const { container } = render(
      <GuestActionInvite message="로그인하면 저장돼요" redirectedFrom="/lab" />,
    );
    const text = container.textContent ?? "";
    expect(text).not.toContain("사세요");
    expect(text).not.toContain("매수");
  });
});
