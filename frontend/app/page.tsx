import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getRegime } from "@/lib/api";
import { LandingNav } from "@/components/landing/LandingNav";
import { Hero } from "@/components/landing/Hero";
import { TopDownFlow } from "@/components/landing/TopDownFlow";
import { ValuePillars } from "@/components/landing/ValuePillars";
import { PricingPreview } from "@/components/landing/PricingPreview";
import { Faq } from "@/components/landing/Faq";
import { FinalCta } from "@/components/landing/FinalCta";
import type { RegimeResult } from "@/lib/types";

export const metadata: Metadata = {
  title: "THESIS — 지금 시장이 어떤 국면인지",
  description:
    "매크로 → 자산배분 → 기업분석을 하나의 흐름으로. 결론은 무료로, 그 근거까지. 한국 시장 특화 투자 판단 근거 서비스. 매수·매도 권유가 아닙니다.",
};

// 공개 랜딩. 로그인 사용자도 강제 redirect 하지 않고 '대시보드로' CTA 만 바꾼다.
export default async function LandingPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAuthed = user !== null;

  // 히어로 제품 X-ray: 익명=free 국면 결론을 SSR 프리페치(실패해도 페이지 유지).
  let regime: RegimeResult | null = null;
  try {
    regime = await getRegime("free");
  } catch {
    regime = null;
  }

  return (
    <>
      <LandingNav isAuthed={isAuthed} />
      <Hero regime={regime} isAuthed={isAuthed} />
      <TopDownFlow />
      <ValuePillars />
      <PricingPreview />
      <Faq />
      <FinalCta isAuthed={isAuthed} />
    </>
  );
}
