import { Flag, Eye, ShieldCheck } from "lucide-react";

// 가치 3기둥 — 기능 나열이 아니라 '무엇이 다른가'의 서사. 과장·확정수익 금지.
const PILLARS = [
  {
    icon: Flag,
    title: "한국 시장에 특화",
    body: "원달러·외국인수급·코스피를 1순위 지표로. 글로벌 툴의 번역본이 아닙니다.",
  },
  {
    icon: Eye,
    title: "결론을 먼저",
    body: "DXY 같은 raw 수치 대신 '지금 어떤 국면인지'를 먼저. 근거는 펼쳐서 봅니다.",
  },
  {
    icon: ShieldCheck,
    title: "과신을 막습니다",
    body: "'지금 사세요'라고 말하지 않습니다. 확률적 근거와 그 한계를 함께 보여줍니다.",
  },
];

export function ValuePillars() {
  return (
    <section className="reveal-up mx-auto max-w-5xl px-4 py-16">
      <div className="grid gap-4 md:grid-cols-3">
        {PILLARS.map((p) => (
          <div
            key={p.title}
            className="rounded-xl border border-border bg-card p-6"
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-foreground">
              <p.icon className="h-5 w-5" aria-hidden />
            </span>
            <h3 className="mt-4 text-lg font-medium">{p.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {p.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
