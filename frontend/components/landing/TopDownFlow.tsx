import { Globe, PieChart, Building2, ArrowDown } from "lucide-react";

// Top-Down 서사: 매크로 → 자산배분 → 기업분석. THESIS의 고정 순서를 그대로 흐름으로.
const STEPS = [
  {
    icon: Globe,
    step: "01",
    title: "매크로 국면",
    body: "글로벌·한국 매크로로 시장이 리스크온인지 리스크오프인지 판정합니다.",
  },
  {
    icon: PieChart,
    step: "02",
    title: "자산배분",
    body: "국면과 당신의 성향에 맞춰 주식·현금·안전자산 비율의 근거를 제시합니다.",
  },
  {
    icon: Building2,
    step: "03",
    title: "기업분석",
    body: "국면에 맞는 섹터·종목으로 좁혀갑니다. (순차 확장 중)",
  },
];

export function TopDownFlow() {
  return (
    <section className="reveal-up mx-auto max-w-5xl px-4 py-16">
      <div className="mb-10 text-center">
        <h2 className="text-2xl font-semibold tracking-tight">
          큰 그림부터, 좁혀갑니다
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          위에서 아래로 — 시장의 맥락을 먼저 보고 종목은 마지막에.
        </p>
      </div>

      <ol className="grid gap-4 md:grid-cols-3">
        {STEPS.map((s, i) => (
          <li
            key={s.step}
            className="relative rounded-xl border border-border bg-card p-6 transition-colors hover:bg-surface-2"
          >
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-regime-on/12 text-regime-on">
                <s.icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="text-xs font-medium tabular-nums text-muted-foreground">
                {s.step}
              </span>
            </div>
            <h3 className="mt-4 text-lg font-medium">{s.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {s.body}
            </p>
            {i < STEPS.length - 1 ? (
              <ArrowDown
                className="absolute -bottom-3 left-1/2 hidden h-6 w-6 -translate-x-1/2 rounded-full border border-border bg-background p-1 text-muted-foreground md:hidden"
                aria-hidden
              />
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
