import { Lightbulb, Compass } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { RegimeLabel, RegimeResult } from "@/lib/types";

// "오늘 살펴볼 한 가지" — 차분한 넛지. conclusion.label 로만 분기.
// 행동 지시('지금 사세요/매도') 절대 금지 — 점검·살펴보기 톤만.
interface Nudge {
  icon: LucideIcon;
  title: string;
  body: string;
}

const NUDGE_BY_LABEL: Record<RegimeLabel, Nudge> = {
  리스크온: {
    icon: Lightbulb,
    title: "오늘 살펴볼 한 가지",
    body: "위험 선호가 우세한 국면입니다 — 비중이 한쪽으로 쏠려 있지 않은지 점검해 볼 시점이에요.",
  },
  중립: {
    icon: Compass,
    title: "오늘 살펴볼 한 가지",
    body: "방향이 뚜렷하지 않은 국면입니다 — 현금 비중과 분산을 한 번 살펴보세요.",
  },
  리스크오프: {
    icon: Compass,
    title: "오늘 살펴볼 한 가지",
    body: "위험 회피 압력이 높아진 국면입니다 — 변동성에 견딜 수 있는 비중인지 점검해 볼 시점이에요.",
  },
};

export function NudgeCard({ data }: { data: RegimeResult }) {
  const nudge = NUDGE_BY_LABEL[data.conclusion.label];
  const Icon = nudge.icon;

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start gap-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <div className="space-y-1.5">
          <h3 className="text-sm font-semibold text-foreground">
            {nudge.title}
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {nudge.body}
          </p>
          <p className="pt-1 text-xs text-muted-foreground">
            참고용이며 매수·매도 권유가 아닙니다.
          </p>
        </div>
      </div>
    </div>
  );
}
