import * as React from "react";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { StatusPill } from "@/components/ui/status-pill";
import type { MarketSnapshot, TickerMetric } from "@/lib/types";

// 한국 1순위 3종(원달러·코스피·VIX)을 한 줄 글랜스 스트립으로.
// 수치 비노출(Free) — threshold_status 가 있으면 StatusPill(색+라벨+점), 없으면 중립 칩.
// 방향(change_pct)은 화살표 + sr-only 텍스트로만 보조(수치 없이). 색 단독 금지.

const TRIAD: { symbol: string; fallbackName: string }[] = [
  { symbol: "KRW=X", fallbackName: "원달러 환율" },
  { symbol: "^KS11", fallbackName: "코스피" },
  { symbol: "^VIX", fallbackName: "변동성(VIX)" },
];

function findMetric(
  snapshot: MarketSnapshot,
  symbol: string,
): TickerMetric | undefined {
  return snapshot.metrics.find((m) => m.symbol === symbol);
}

// change_pct 부호만으로 방향 화살표. 수치는 노출하지 않는다.
function DirectionHint({ changePct }: { changePct?: number | null }) {
  if (changePct === null || changePct === undefined) return null;
  const isUp = changePct > 0;
  const isDown = changePct < 0;
  const Icon = isUp ? ArrowUp : isDown ? ArrowDown : Minus;
  const text = isUp ? "상승" : isDown ? "하락" : "보합";
  return (
    <span className="inline-flex items-center text-muted-foreground">
      <Icon className="h-3 w-3" aria-hidden />
      <span className="sr-only">{text}</span>
    </span>
  );
}

function TriadChip({
  metric,
  fallbackName,
}: {
  metric: TickerMetric | undefined;
  fallbackName: string;
}) {
  const label = metric?.display_name ?? fallbackName;

  return (
    <div className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
      <div className="flex min-w-0 flex-col gap-1">
        <span className="truncate text-xs font-medium text-muted-foreground">
          {label}
        </span>
        <div className="flex items-center gap-1.5">
          {metric && metric.threshold_status ? (
            <StatusPill status={metric.threshold_status} size="sm" />
          ) : (
            // metric 누락 또는 threshold 미산출 → 차분한 중립 칩(가짜 수치 금지).
            <span className="inline-flex h-6 items-center rounded-md border border-border bg-surface-1 px-2 text-[11px] font-medium text-muted-foreground">
              {metric ? "관찰 중" : "불러올 수 없음"}
            </span>
          )}
          {metric ? <DirectionHint changePct={metric.change_pct} /> : null}
        </div>
      </div>
    </div>
  );
}

export interface KoreaTriadStripProps
  extends React.HTMLAttributes<HTMLDivElement> {
  snapshot: MarketSnapshot | null;
}

export function KoreaTriadStrip({
  snapshot,
  className,
  ...props
}: KoreaTriadStripProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-2 sm:grid-cols-3",
        className,
      )}
      aria-label="한국 1순위 지표 한눈에"
      {...props}
    >
      {TRIAD.map(({ symbol, fallbackName }) => (
        <TriadChip
          key={symbol}
          metric={snapshot ? findMetric(snapshot, symbol) : undefined}
          fallbackName={fallbackName}
        />
      ))}
    </div>
  );
}
