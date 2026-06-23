import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PlanComparison } from "@/components/billing/PlanComparison";

// 랜딩 가격 미리보기 — compact 비교표(카드 3개·연간 토글)로 '결론 무료/근거 유료'를 전달.
// 가격·기능은 lib/plans 단일출처(PlanComparison 내부). 전체 비교표는 /pricing 으로 유도.
export function PricingPreview() {
  return (
    <section className="reveal-up mx-auto max-w-5xl px-4 py-16">
      <div className="mb-10 text-center">
        <h2 className="text-2xl font-semibold tracking-tight">
          결론은 무료, 근거는 Pro
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          맛보기는 충분히, 깊이는 합리적으로.
        </p>
      </div>

      <PlanComparison compact />

      <div className="mt-8 text-center">
        <Link
          href="/pricing"
          className="inline-flex items-center gap-1 text-sm font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20 focus-visible:rounded-sm"
        >
          전체 플랜 비교 보기
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
