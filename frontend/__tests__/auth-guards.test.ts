import { describe, it, expect } from "vitest";
import { isProtectedPath, safeInternalPath } from "@/lib/auth/guards";

describe("isProtectedPath — 보호 경로는 settings·portfolio(및 하위)만", () => {
  it("보호 경로와 그 하위는 true", () => {
    expect(isProtectedPath("/settings")).toBe(true);
    expect(isProtectedPath("/settings/profile")).toBe(true);
    expect(isProtectedPath("/portfolio")).toBe(true);
    expect(isProtectedPath("/portfolio/123")).toBe(true);
  });

  it("게스트 공개 결론 페이지는 false(미보호)", () => {
    for (const p of [
      "/",
      "/dashboard",
      "/indicators",
      "/allocation",
      "/screener",
      "/lab",
      "/pricing",
      "/login",
    ]) {
      expect(isProtectedPath(p)).toBe(false);
    }
  });

  it("prefix 유사 경로를 오매칭하지 않는다", () => {
    expect(isProtectedPath("/settings-export")).toBe(false);
    expect(isProtectedPath("/portfolios")).toBe(false);
  });
});

describe("safeInternalPath — 오픈 리다이렉트 방지", () => {
  it("같은 오리진 내부 절대경로는 그대로 통과", () => {
    expect(safeInternalPath("/dashboard")).toBe("/dashboard");
    expect(safeInternalPath("/screener?x=1")).toBe("/screener?x=1");
    expect(safeInternalPath("/lab#a")).toBe("/lab#a");
  });

  it("외부 URL·프로토콜상대·백슬래시·상대·빈값은 폴백", () => {
    expect(safeInternalPath("https://evil.com")).toBe("/dashboard");
    expect(safeInternalPath("http://evil.com")).toBe("/dashboard");
    expect(safeInternalPath("//evil.com")).toBe("/dashboard");
    expect(safeInternalPath("/\\evil.com")).toBe("/dashboard");
    expect(safeInternalPath("relative/path")).toBe("/dashboard");
    expect(safeInternalPath("")).toBe("/dashboard");
    expect(safeInternalPath(null)).toBe("/dashboard");
    expect(safeInternalPath(undefined)).toBe("/dashboard");
  });

  it("커스텀 폴백을 존중한다", () => {
    expect(safeInternalPath(null, "/")).toBe("/");
    expect(safeInternalPath("//evil", "/login")).toBe("/login");
  });
});
