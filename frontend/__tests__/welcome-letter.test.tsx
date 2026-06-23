import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { WelcomeLetter } from "@/components/onboarding/WelcomeLetter";

// dismiss 영속(localStorage) 테스트 — 케이스 간 격리를 위해 매번 초기화(globals:false라 수동 등록).
beforeEach(() => localStorage.clear());

const HEADING = "THESIS에 오신 걸 환영합니다";

describe("WelcomeLetter — 게스트 가입 유도 분기", () => {
  it("게스트(isAuthed=false)는 무가입 안내 + 무료로 시작 링크를 본다", async () => {
    render(<WelcomeLetter isAuthed={false} />);
    expect(await screen.findByText(HEADING)).toBeInTheDocument();
    expect(screen.getByText("무료로 시작")).toBeInTheDocument();
    expect(screen.getByText(/가입 없이 둘러보는 중/)).toBeInTheDocument();
    // 가입 링크는 /signup 으로
    expect(screen.getByText("무료로 시작").closest("a")).toHaveAttribute(
      "href",
      "/signup",
    );
  });

  it("인증 사용자(기본값)는 가입 유도 링크를 보지 않는다(오리엔테이션은 동일)", async () => {
    render(<WelcomeLetter />);
    expect(await screen.findByText(HEADING)).toBeInTheDocument();
    expect(screen.queryByText("무료로 시작")).toBeNull();
    expect(screen.queryByText(/가입 없이 둘러보는 중/)).toBeNull();
  });

  it("닫으면 사라지고 localStorage에 기록되어 재노출하지 않는다", async () => {
    render(<WelcomeLetter isAuthed={false} />);
    await screen.findByText(HEADING);
    fireEvent.click(screen.getByLabelText("환영 안내 닫기"));
    expect(screen.queryByText(HEADING)).toBeNull();
    expect(localStorage.getItem("thesis:welcome:dismissed")).toBe("1");
  });

  it("이미 닫은 적이 있으면(localStorage=1) 처음부터 렌더하지 않는다", () => {
    localStorage.setItem("thesis:welcome:dismissed", "1");
    render(<WelcomeLetter isAuthed={false} />);
    expect(screen.queryByText(HEADING)).toBeNull();
  });

  it("'무료로 시작' 클릭도 dismiss를 기록한다(가입 이동 시 재노출 방지)", async () => {
    render(<WelcomeLetter isAuthed={false} />);
    await screen.findByText(HEADING);
    fireEvent.click(screen.getByText("무료로 시작"));
    expect(localStorage.getItem("thesis:welcome:dismissed")).toBe("1");
  });
});
