import { Panel } from "@/components/ui/panel";
import { MetricCard, ForeignFlowMetric } from "@/components/ui/metric-card";
import type { Layer, MarketSnapshot, TickerMetric, Tier } from "@/lib/types";

// 지표 상세 전폭 보드. 프레젠테이션 전용 서버 컴포넌트('use client' 없음).
// 카드 렌더는 MetricCard(ui/metric-card)로 통합 — raw 비노출/중립색/신선도 철학은 MetricCard가 보존.
// 레이어 그룹/표시 순서 구조는 그대로 유지. tier 는 페이지→prop(기본 free, 하위호환).

// 레이어 그룹 정의(표시 순서 고정 — Top-Down: 글로벌 → 한국 → 위험선호 → 섹터·기업).
const LAYER_SECTIONS: { layer: Layer; title: string; description: string }[] = [
  {
    layer: "L1",
    title: "글로벌 매크로",
    description: "달러·금리 등 전 세계 흐름의 큰 틀입니다.",
  },
  {
    layer: "L2",
    title: "한국 매크로",
    description: "원달러·코스피 등 한국 시장의 1순위 지표입니다.",
  },
  {
    layer: "L3",
    title: "위험선호 · 원자재",
    description: "변동성과 원자재로 시장의 위험선호를 가늠합니다.",
  },
  {
    layer: "L4",
    title: "섹터 · 기업",
    description: "관심 섹터와 기업의 최근 흐름입니다.",
  },
];

function groupByLayer(metrics: TickerMetric[], layer: Layer): TickerMetric[] {
  return metrics.filter((m) => m.layer === layer);
}

function LayerSection({
  title,
  description,
  metrics,
  tier,
}: {
  title: string;
  description: string;
  metrics: TickerMetric[];
  tier: Tier;
}) {
  if (metrics.length === 0) return null;

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map((m) => (
          <MetricCard key={m.symbol} metric={m} tier={tier} />
        ))}
      </div>
    </section>
  );
}

export function IndicatorsBoard({
  snapshot,
  tier = "free",
}: {
  snapshot: MarketSnapshot | null;
  tier?: Tier;
}) {
  if (snapshot === null) {
    return (
      <Panel>
        <p className="text-sm text-muted-foreground">
          데이터를 불러올 수 없습니다
        </p>
      </Panel>
    );
  }

  return (
    <div className="space-y-8">
      {LAYER_SECTIONS.map(({ layer, title, description }) => (
        <LayerSection
          key={layer}
          title={title}
          description={description}
          metrics={groupByLayer(snapshot.metrics, layer)}
          tier={tier}
        />
      ))}

      {/* 한국 1순위 보조지표: 외국인 수급(미수집 시 준비중 정직 표기) */}
      <section className="space-y-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-foreground">
            수급
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            외국인 등 시장 참여자의 매매 흐름입니다.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <ForeignFlowMetric flow={snapshot.foreign_flow} />
        </div>
      </section>
    </div>
  );
}
