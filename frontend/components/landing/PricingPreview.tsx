import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

// 요금 투명 공개 — 숨기면 이탈↑. '결론 무료 / 근거 유료' 구조를 그대로 전달.
const PLANS = [
  {
    name: "Free",
    price: "₩0",
    period: "",
    features: ["시장 국면 신호", "기본 지표 3개", "단순 자산배분"],
    cta: "무료로 시작",
    href: "/signup",
    highlight: false,
  },
  {
    name: "Pro",
    price: "₩9,900",
    period: "/월",
    features: [
      "실시간 데이터",
      "지표 상세 근거",
      "기업분석 · 포트폴리오 추적",
    ],
    cta: "Pro 시작하기",
    href: "/signup",
    highlight: true,
  },
  {
    name: "Quant",
    price: "₩29,900",
    period: "/월",
    features: ["Pro 전체", "API · 커스텀 스크리너", "백테스트"],
    cta: "준비 중",
    href: null,
    highlight: false,
  },
];

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

      <div className="grid gap-4 md:grid-cols-3">
        {PLANS.map((plan) => (
          <div
            key={plan.name}
            className={
              "flex flex-col rounded-xl border bg-card p-6 " +
              (plan.highlight
                ? "border-regime-on/50 ring-1 ring-regime-on/30"
                : "border-border")
            }
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{plan.name}</span>
              {plan.highlight ? (
                <span className="rounded-full bg-regime-on/15 px-2 py-0.5 text-[10px] font-medium text-regime-on">
                  추천
                </span>
              ) : null}
            </div>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-2xl font-semibold tabular-nums">
                {plan.price}
              </span>
              <span className="text-sm text-muted-foreground">{plan.period}</span>
            </div>
            <ul className="mt-5 flex-1 space-y-2 text-sm text-muted-foreground">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check
                    className="mt-0.5 h-4 w-4 shrink-0 text-regime-on"
                    aria-hidden
                  />
                  {f}
                </li>
              ))}
            </ul>
            <div className="mt-6">
              {plan.href ? (
                <Link href={plan.href} className="block">
                  <Button
                    variant={plan.highlight ? "default" : "outline"}
                    className="w-full"
                  >
                    {plan.cta}
                  </Button>
                </Link>
              ) : (
                <Button variant="locked" className="w-full" disabled>
                  {plan.cta}
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
