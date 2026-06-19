import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import type {
  ForeignFlowStub,
  Layer,
  MarketSnapshot,
  TickerMetric,
  TrendLabel,
} from "@/lib/types";

// 지표 상세 전폭 보드. 프레젠테이션 전용 서버 컴포넌트('use client' 없음).
// 설계철학: raw 레벨 수치(원달러 1,420 / VIX 27.4) 직접 노출 금지 — change_pct(%)·방향·라벨만.
// 색만으로 의미 전달 금지 → 화살표/부호/sr-only를 색과 병기, 색은 중립(text-muted-foreground)으로
// 매수신호 암시 차단(초록=좋음/빨강=나쁨 금지).

// trend.label(영문 enum) → 차분한 한국어 라벨. raw enum 직접 노출 금지.
const TREND_TEXT: Record<TrendLabel, string> = {
  uptrend: "상승 추세",
  downtrend: "하락 추세",
  sideways: "횡보",
  insufficient_data: "추세 판단 보류",
};

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

function TickerCard({ metric }: { metric: TickerMetric }) {
  // 수집 실패 → 차분한 '불러올 수 없음'.
  if (metric.status === "failed") {
    return (
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-sm font-medium text-foreground">
          {metric.display_name}
        </p>
        <p className="mt-3 text-sm text-muted-foreground">불러올 수 없음</p>
      </div>
    );
  }

  const changePct = metric.change_pct;
  const hasChange = typeof changePct === "number";
  const direction = hasChange
    ? changePct > 0
      ? "up"
      : changePct < 0
        ? "down"
        : "flat"
    : "flat";

  const DirectionIcon =
    direction === "up" ? ArrowUp : direction === "down" ? ArrowDown : Minus;

  // 부호 + 절댓값(%) — 색은 중립 유지(초록/빨강 매수신호색 금지).
  const sign = direction === "up" ? "+" : direction === "down" ? "−" : "";
  const changeText = hasChange
    ? `${sign}${Math.abs(changePct).toFixed(2)}%`
    : "변동 정보 없음";

  const trendText = TREND_TEXT[metric.trend.label];

  return (
    <div className="rounded-xl border border-border bg-card p-5 transition-colors hover:bg-surface-2">
      <p className="text-sm font-medium text-foreground">
        {metric.display_name}
      </p>

      <div className="mt-3 flex items-baseline gap-1.5 text-muted-foreground">
        {hasChange ? (
          <DirectionIcon className="h-4 w-4 self-center" aria-hidden />
        ) : null}
        <span className="text-lg font-semibold tabular-nums">{changeText}</span>
        {hasChange ? (
          <span className="sr-only">
            전일 대비{" "}
            {direction === "up"
              ? "상승"
              : direction === "down"
                ? "하락"
                : "보합"}
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="rounded-md border border-border bg-muted/40 px-2 py-0.5 text-xs text-muted-foreground">
          {trendText}
        </span>
        {metric.status === "stale" ? (
          <span className="rounded-md border border-border bg-muted/40 px-2 py-0.5 text-xs text-muted-foreground">
            지연
          </span>
        ) : null}
      </div>
    </div>
  );
}

function ForeignFlowCard({ flow }: { flow: ForeignFlowStub }) {
  // 외국인수급: 미수집 → '준비중' 정직 표기. 가짜 숫자 금지.
  if (!flow.available) {
    return (
      <div className="rounded-xl border border-border bg-surface-2 p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-muted-foreground">
            외국인 수급
          </p>
          <span className="rounded-full border border-border bg-muted/40 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            준비중
          </span>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          {flow.note}
        </p>
      </div>
    );
  }

  // available=true 라도 raw 금액 레벨은 노출하지 않고 방향/연속일만 차분히 요약.
  const days = flow.consecutive_sell_days;
  const summary =
    typeof days === "number" && days > 0
      ? `최근 ${days}일 연속 순매도 흐름이 관찰됩니다.`
      : flow.note;

  return (
    <div className="rounded-xl border border-border bg-card p-5 transition-colors hover:bg-surface-2">
      <p className="text-sm font-medium text-foreground">외국인 수급</p>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        {summary}
      </p>
    </div>
  );
}

function LayerSection({
  title,
  description,
  metrics,
}: {
  title: string;
  description: string;
  metrics: TickerMetric[];
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
          <TickerCard key={m.symbol} metric={m} />
        ))}
      </div>
    </section>
  );
}

export function IndicatorsBoard({
  snapshot,
}: {
  snapshot: MarketSnapshot | null;
}) {
  if (snapshot === null) {
    return (
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-sm text-muted-foreground">
          데이터를 불러올 수 없습니다
        </p>
      </div>
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
          <ForeignFlowCard flow={snapshot.foreign_flow} />
        </div>
      </section>
    </div>
  );
}
