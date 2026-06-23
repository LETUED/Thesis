import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Panel } from "@/components/ui/panel";
import { MetricCard, ForeignFlowMetric } from "@/components/ui/metric-card";
import { AlertRuleControl } from "@/components/personalization/AlertRuleControl";
import type { MarketSnapshot, TickerMetric, Tier } from "@/lib/types";

// 한국 1순위 매크로 미니보드. 프레젠테이션 전용 서버 컴포넌트('use client' 없음).
// 카드 렌더는 MetricCard(ui/metric-card)로 통합 — raw 비노출/중립색/신선도 철학은 MetricCard가 보존.
// tier 는 페이지→prop 으로 전달(기본 free, 하위호환). Free=잠금자리, Pro=정량.

// 한국 1순위 카드에 노출할 심볼 → 표시명 폴백(metric 없을 때도 자리 유지).
const MACRO_SYMBOLS: { symbol: string; fallbackName: string }[] = [
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

export function KoreaMacroBoard({
  snapshot,
  tier = "free",
}: {
  snapshot: MarketSnapshot | null;
  tier?: Tier;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">오늘의 매크로 (한국 1순위)</CardTitle>
      </CardHeader>
      <CardContent>
        {snapshot === null ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <Panel key={i}>
                <p className="text-sm text-muted-foreground">
                  데이터를 불러올 수 없습니다
                </p>
              </Panel>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {MACRO_SYMBOLS.map(({ symbol, fallbackName }) => {
              const metric = findMetric(snapshot, symbol);
              // metric 누락 → 자리 유지(가짜 수치 금지). 차분한 '불러올 수 없음'.
              if (!metric) {
                return (
                  <Panel key={symbol}>
                    <p className="text-sm font-medium text-foreground">
                      {fallbackName}
                    </p>
                    <p className="mt-3 text-sm text-muted-foreground">
                      불러올 수 없음
                    </p>
                  </Panel>
                );
              }
              return (
                <MetricCard
                  key={symbol}
                  metric={metric}
                  tier={tier}
                  slot={
                    <AlertRuleControl
                      symbol={metric.symbol}
                      displayName={metric.display_name}
                      tier={tier}
                    />
                  }
                />
              );
            })}
            <ForeignFlowMetric flow={snapshot.foreign_flow} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
