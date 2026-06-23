import type { MetadataRoute } from "next";
import { PROTECTED_PREFIXES } from "@/lib/auth/guards";

// 검색엔진 정책 — 게스트 공개 결론 페이지(/, /dashboard, /indicators, /allocation,
// /screener, /lab, /pricing)는 색인 허용. 보호 경로는 미들웨어와 동일하게
// PROTECTED_PREFIXES 단일출처에서 파생(정책 드리프트 방지), 인증·결제 경로를 추가 제외.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [...PROTECTED_PREFIXES, "/billing/", "/auth/", "/login", "/signup"],
    },
  };
}
