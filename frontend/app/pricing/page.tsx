import type { Metadata } from "next";
import { Info } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { LandingNav } from "@/components/landing/LandingNav";
import { FinalCta } from "@/components/landing/FinalCta";
import { PlanComparison } from "@/components/billing/PlanComparison";
import { NoticeBanner } from "@/components/ui/notice-banner";

export const metadata: Metadata = {
  title: "THESIS — 요금제",
  description:
    "결론은 무료, 근거·상세·실시간·무제한은 유료. Free·Pro·Quant 세 플랜을 한눈에 비교하고 연간 결제로 절약하세요. 매수·매도 권유가 아닙니다.",
};

// 공개 가격 페이지(인증 불필요). 전체 비교표(연간 토글·Pro 강조·Quant 앵커) 중심.
// 헤더/푸터는 랜딩 레이아웃 패턴 재사용(LandingNav·FinalCta, 푸터 disclaimer 는 root layout).
export default async function PricingPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAuthed = user !== null;

  return (
    <>
      <LandingNav isAuthed={isAuthed} />

      <main id="main" tabIndex={-1} className="outline-none">
      <section className="reveal-up mx-auto max-w-5xl px-4 pb-12 pt-16">
        <div className="mx-auto mb-10 max-w-xl text-center">
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
            필요한 만큼만, 합리적으로
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            결론은 언제나 무료입니다. 그 결론의 근거와 상세 지표, 실시간
            데이터까지 깊이 보고 싶을 때 Pro로 펼쳐집니다.
          </p>
        </div>

        <PlanComparison />

        <NoticeBanner tone="info" icon={Info} className="mx-auto mt-10 max-w-3xl text-xs">
          유료 플랜은 더 많은 지표와 더 깊은 근거, 더 자주 갱신되는 데이터를
          제공할 뿐입니다. 어떤 플랜도 수익을 보장하거나 매수·매도를 권유하지
          않으며, 모든 투자 판단과 책임은 이용자 본인에게 있습니다.
        </NoticeBanner>
      </section>

      <FinalCta isAuthed={isAuthed} />
      </main>
    </>
  );
}
