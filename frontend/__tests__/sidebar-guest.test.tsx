import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// usePathname 은 라우터 컨텍스트가 필요 — 활성 표시만 쓰므로 고정 stub.
vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard" }));

import { Sidebar } from "@/components/app-shell/Sidebar";

describe("Sidebar — 게스트 보호 항목 숨김", () => {
  it("게스트(isAuthed=false)는 설정·포트폴리오 링크를 보지 않는다", () => {
    render(<Sidebar isAuthed={false} />);
    expect(screen.queryByText("설정")).toBeNull();
    expect(screen.queryByText("포트폴리오")).toBeNull();
    // 공개 결론 네비는 보인다.
    expect(screen.getByText("오늘")).toBeInTheDocument();
    expect(screen.getByText("기업분석")).toBeInTheDocument();
  });

  it("인증 사용자(기본값)는 설정·포트폴리오 링크를 본다", () => {
    render(<Sidebar />);
    expect(screen.getByText("설정")).toBeInTheDocument();
    expect(screen.getByText("포트폴리오")).toBeInTheDocument();
  });
});
