import type { MetadataRoute } from "next";
import { PUBLIC_ROUTES } from "@/lib/auth/guards";

// 사이트맵 — robots.ts 와 짝. 게스트 공개 결론 페이지(PUBLIC_ROUTES 단일출처)만 색인 안내한다.
// base URL 은 배포 도메인(NEXT_PUBLIC_SITE_URL)로 오버라이드, 로컬은 폴백(시크릿 아님).
export default function sitemap(): MetadataRoute.Sitemap {
  // 끝 슬래시 정규화 — NEXT_PUBLIC_SITE_URL 에 trailing slash(예: Vercel)가 있어도
  // "example.com//dashboard" 이중 슬래시가 생기지 않게.
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(
    /\/+$/,
    "",
  );
  return PUBLIC_ROUTES.map((path) => ({
    // path === "/" 면 base 그대로(이중 슬래시 방지).
    url: `${base}${path === "/" ? "" : path}`,
    changeFrequency: "daily",
    priority: path === "/" ? 1 : 0.7,
  }));
}
