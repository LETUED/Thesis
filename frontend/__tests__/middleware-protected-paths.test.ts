import { describe, it, expect } from "vitest";
import { isProtectedPath } from "@/lib/supabase/middleware";
import { NAV, isLocked } from "@/components/app-shell/Sidebar";

// 게이트 정책 회귀 방지(설계철학 6: 결론 무료/근거 유료).
// 결론 페이지(/dashboard·/allocation)는 익명 접근 허용 → 보호 대상이 아니다.
// 근거 상세·개인화 페이지는 로그인 게이트를 유지해야 한다.
// 이 단언이 깨지면 게이트가 우발적으로 되돌려졌다는 신호다.

describe("isProtectedPath — 로그인 게이트 정책", () => {
  it("결론 무료 페이지는 보호 대상이 아니다(익명 허용)", () => {
    expect(isProtectedPath("/dashboard")).toBe(false);
    expect(isProtectedPath("/allocation")).toBe(false);
  });

  it("결론 페이지의 하위 경로도 익명 허용", () => {
    expect(isProtectedPath("/dashboard/anything")).toBe(false);
    expect(isProtectedPath("/allocation/detail")).toBe(false);
  });

  it("근거 상세·개인화 페이지는 로그인 게이트를 유지한다", () => {
    expect(isProtectedPath("/indicators")).toBe(true);
    expect(isProtectedPath("/lab")).toBe(true);
    expect(isProtectedPath("/portfolio")).toBe(true);
    expect(isProtectedPath("/screener")).toBe(true);
    expect(isProtectedPath("/settings")).toBe(true);
  });

  it("보호 경로의 하위 경로도 게이트 대상이다", () => {
    expect(isProtectedPath("/indicators/16")).toBe(true);
    expect(isProtectedPath("/settings/profile")).toBe(true);
  });

  it("공개 경로(랜딩·인증)는 보호 대상이 아니다", () => {
    expect(isProtectedPath("/")).toBe(false);
    expect(isProtectedPath("/login")).toBe(false);
    expect(isProtectedPath("/signup")).toBe(false);
    expect(isProtectedPath("/pricing")).toBe(false);
  });
});

// 사이드바의 protected 플래그가 미들웨어 게이트 정책과 따로 놀지 않게 강제한다.
// (정책이 두 곳에 분리되어 수동 동기화에 의존하는 위험 → 테스트로 일치를 못박음.)
describe("Sidebar NAV — 미들웨어 게이트 정책과의 일치", () => {
  it("NAV 의 각 항목 protected 여부가 isProtectedPath 와 정확히 일치한다", () => {
    for (const item of NAV) {
      const flagged = "protected" in item && item.protected === true;
      expect(flagged).toBe(isProtectedPath(item.href));
    }
  });

  it("익명에게 결론 페이지(/dashboard·/allocation)는 잠기지 않는다", () => {
    for (const item of NAV) {
      if (item.href === "/dashboard" || item.href === "/allocation") {
        expect(isLocked(item, false)).toBe(false);
      }
    }
  });

  it("익명에게 보호 페이지는 잠금(자물쇠) 표시 대상이다", () => {
    const indicators = NAV.find((i) => i.href === "/indicators")!;
    const settings = NAV.find((i) => i.href === "/settings")!;
    expect(isLocked(indicators, false)).toBe(true);
    expect(isLocked(settings, false)).toBe(true);
  });

  it("로그인 사용자에게는 어떤 항목도 잠기지 않는다", () => {
    for (const item of NAV) {
      expect(isLocked(item, true)).toBe(false);
    }
  });
});
