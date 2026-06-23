import { describe, it, expect } from "vitest";
import sitemap from "@/app/sitemap";
import { PUBLIC_ROUTES } from "@/lib/auth/guards";

describe("sitemap — 공개 결론 페이지만 색인 안내", () => {
  const entries = sitemap();
  const urls = entries.map((e) => e.url);

  it("엔트리 수가 PUBLIC_ROUTES 와 일치하고 메타 필드를 갖는다", () => {
    expect(entries).toHaveLength(PUBLIC_ROUTES.length);
    expect(entries.every((e) => e.changeFrequency === "daily")).toBe(true);
    expect(entries.every((e) => typeof e.priority === "number")).toBe(true);
  });

  it("게스트 공개 페이지를 포함한다", () => {
    expect(urls.some((u) => u.endsWith("/dashboard"))).toBe(true);
    expect(urls.some((u) => u.endsWith("/screener"))).toBe(true);
    expect(urls.some((u) => u.endsWith("/allocation"))).toBe(true);
    expect(urls.some((u) => u.endsWith("/pricing"))).toBe(true);
  });

  it("보호·인증·결제 경로는 제외한다", () => {
    expect(urls.some((u) => u.includes("/settings"))).toBe(false);
    expect(urls.some((u) => u.includes("/portfolio"))).toBe(false);
    expect(urls.some((u) => u.includes("/billing"))).toBe(false);
    expect(urls.some((u) => u.includes("/login"))).toBe(false);
    expect(urls.some((u) => u.includes("/signup"))).toBe(false);
  });

  it("루트는 base 그대로(이중 슬래시 없음)", () => {
    expect(urls).toContain("http://localhost:3000");
    expect(urls.some((u) => u.includes("//dashboard"))).toBe(false);
  });

  it("base URL 끝 슬래시를 정규화한다(Vercel 등)", () => {
    const prev = process.env.NEXT_PUBLIC_SITE_URL;
    process.env.NEXT_PUBLIC_SITE_URL = "https://example.com/";
    try {
      const u = sitemap().map((e) => e.url);
      expect(u.some((x) => x.includes("com//"))).toBe(false);
      expect(u).toContain("https://example.com/dashboard");
      expect(u).toContain("https://example.com");
    } finally {
      process.env.NEXT_PUBLIC_SITE_URL = prev;
    }
  });
});
