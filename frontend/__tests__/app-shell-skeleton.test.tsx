import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AppShellSkeleton } from "@/components/app-shell/AppShellSkeleton";

describe("AppShellSkeleton — 로딩 셸", () => {
  it("자식(로딩 콘텐츠)을 콘텐츠 영역에 렌더한다", () => {
    render(
      <AppShellSkeleton>
        <div data-testid="loading-content">로딩 스켈레톤</div>
      </AppShellSkeleton>,
    );
    expect(screen.getByTestId("loading-content")).toBeInTheDocument();
  });

  it("로딩 상태를 보조기술에 알린다(aria-busy)", () => {
    const { container } = render(
      <AppShellSkeleton>
        <span>x</span>
      </AppShellSkeleton>,
    );
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
  });

  it("콘텐츠 영역이 실제 AppShell 과 같은 폭(max-w-7xl)으로 정렬돼 점프를 막는다", () => {
    const { container } = render(
      <AppShellSkeleton>
        <span>x</span>
      </AppShellSkeleton>,
    );
    // 드리프트 회귀 가드 — SHELL_MAIN 단일출처가 깨지면 여기서 잡힌다.
    expect(container.querySelector('[class*="max-w-7xl"]')).not.toBeNull();
  });

  it("중복 main 방지 — 스켈레톤은 main 랜드마크를 렌더하지 않는다(RootLayout 단일 제공)", () => {
    render(
      <AppShellSkeleton>
        <span>x</span>
      </AppShellSkeleton>,
    );
    expect(screen.queryByRole("main")).toBeNull();
  });
});
