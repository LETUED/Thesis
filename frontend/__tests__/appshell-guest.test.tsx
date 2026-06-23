import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// AppShell 이 끌어오는 클라이언트/결제/사이드바 의존을 stub — 게스트 헤더 분기만 검증.
vi.mock("@/components/app-shell/Sidebar", () => ({
  Sidebar: () => null,
  MobileNav: () => null,
}));
vi.mock("@/components/theme/ThemeToggle", () => ({ ThemeToggle: () => null }));
vi.mock("@/components/LogoutButton", () => ({
  LogoutButton: () => <button type="button">로그아웃</button>,
}));
vi.mock("@/components/billing/UpgradeButton", () => ({
  UpgradeButton: () => <button type="button">Pro 업그레이드</button>,
}));
vi.mock("@/components/billing/ManageSubscriptionButton", () => ({
  ManageSubscriptionButton: () => <button type="button">구독 관리</button>,
}));

import { AppShell } from "@/components/app-shell/AppShell";

describe("AppShell — 게스트/인증 헤더 분기", () => {
  it("게스트(isAuthed=false)는 로그인/무료로 시작 CTA, 로그아웃·업그레이드 숨김", () => {
    render(
      <AppShell tier="free" isAuthed={false}>
        <div>guest</div>
      </AppShell>,
    );
    expect(screen.getByText("로그인")).toBeInTheDocument();
    expect(screen.getByText("무료로 시작")).toBeInTheDocument();
    expect(screen.queryByText("로그아웃")).toBeNull();
    expect(screen.queryByText("Pro 업그레이드")).toBeNull();
  });

  it("인증 사용자(기본값)는 로그아웃·업그레이드 노출, 게스트 CTA 없음", () => {
    render(
      <AppShell tier="free">
        <div>member</div>
      </AppShell>,
    );
    expect(screen.getByText("로그아웃")).toBeInTheDocument();
    expect(screen.getByText("Pro 업그레이드")).toBeInTheDocument();
    expect(screen.queryByText("무료로 시작")).toBeNull();
  });

  it("중복 main 방지 — AppShell 은 main 랜드마크를 렌더하지 않는다(RootLayout 단일 제공)", () => {
    render(
      <AppShell tier="free">
        <div>content</div>
      </AppShell>,
    );
    expect(screen.queryByRole("main")).toBeNull();
  });
});
