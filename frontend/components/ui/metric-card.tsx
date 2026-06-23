import * as React from "react";
import { cn } from "@/lib/utils/cn";
import type { ForeignFlowStub, TickerMetric, Tier, TrendLabel } from "@/lib/types";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import { Chip } from "@/components/ui/chip";
import { LockedValue } from "@/components/ui/locked-value";
import { Sparkline } from "@/components/ui/viz/sparkline";
import { ThresholdGauge } from "@/components/ui/viz/threshold-gauge";
import { DeltaText } from "@/components/ui/viz/delta-text";

// 통합 지표 카드. KoreaMacroBoard(MacroMiniCard·ForeignFlowCard)·IndicatorsBoard(TickerCard) 3종 통합.
// 프레젠테이션 전용(인터랙션 없음) → 'use client' 없음. AlertRuleControl 등 인터랙티브는 slot 으로 주입.
// 설계철학 보존:
//  - raw 레벨 수치 직접 노출 금지: Free 는 LockedValue, Pro 만 latest/sma 정량 노출.
//  - 색 단독 의미전달 금지: StatusPill·ThresholdGauge·DeltaText 가 텍스트/점/글리프/sr-only 병기.
//  - 중립 기조: 방향/추세 라벨은 차분한 정성 표현, '매수' 암시 색 금지.
//  - 신선도(stale) 명시, 실패/누락은 차분한 '불러올 수 없음'.

// trend.label(영문 enum) → 차분한 한국어 라벨. raw enum 직접 노출 금지.
const TREND_TEXT: Record<TrendLabel, string> = {
  uptrend: "상승 추세",
  downtrend: "하락 추세",
  sideways: "횡보",
  insufficient_data: "추세 판단 보류",
};

// Pro 실수치 스파크라인 시드: 정렬된 sma(장기→단기)+최근값으로 추세 도식. 2점 미만이면 schematic 폴백.
function buildRealSeries(metric: TickerMetric): number[] | null {
  const points: number[] = [];
  const sma20 = metric.trend.sma20;
  const sma5 = metric.trend.sma5;
  if (typeof sma20 === "number") points.push(sma20);
  if (typeof sma5 === "number") points.push(sma5);
  if (typeof metric.latest === "number") points.push(metric.latest);
  return points.length >= 2 ? points : null;
}

export interface MetricCardProps {
  metric: TickerMetric;
  tier: Tier;
  // AlertRuleControl 등 인터랙티브 컨트롤 슬롯(현재 미사용 — 소비처가 클라이언트 컴포넌트 주입).
  slot?: React.ReactNode;
  className?: string;
}

export function MetricCard({ metric, tier, slot, className }: MetricCardProps) {
  // metric 수집 실패 → 차분한 '불러올 수 없음'(자리 유지, 가짜 수치 금지).
  if (metric.status === "failed") {
    return (
      <Panel className={className}>
        <p className="text-sm font-medium text-foreground">
          {metric.display_name}
        </p>
        <p className="mt-3 text-sm text-muted-foreground">불러올 수 없음</p>
      </Panel>
    );
  }

  const isPro = tier === "pro";
  const status = metric.threshold_status ?? null;
  const changePct = metric.change_pct;
  const hasChange = typeof changePct === "number";

  // DeltaText 방향: change_pct 부호로 도출(DeltaText 내부에서 value 로 처리).
  const direction: "up" | "down" | null = hasChange
    ? changePct > 0
      ? "up"
      : changePct < 0
        ? "down"
        : null
    : null;

  const trendText = TREND_TEXT[metric.trend.label];
  const realSeries = isPro ? buildRealSeries(metric) : null;

  return (
    <Panel className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-foreground">
          {metric.display_name}
        </p>
        {status ? <StatusPill status={status} size="sm" /> : null}
      </div>

      <Sparkline
        variant={isPro && realSeries ? "real" : "schematic"}
        data={realSeries}
        ariaLabel={`${metric.display_name} 최근 추세`}
      />

      {status ? <ThresholdGauge status={status} /> : null}

      <div className="flex items-baseline gap-2">
        <DeltaText
          value={hasChange ? changePct : null}
          tier={tier}
          status={status}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Chip variant="muted">{trendText}</Chip>
        {metric.status === "stale" ? (
          <Chip variant="muted">지연 데이터</Chip>
        ) : null}
      </div>

      {/* raw 영역: Free=잠금 자리, Pro=latest·sma 정량 노출 */}
      {isPro ? (
        <ProRawValues metric={metric} />
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <LockedValue
            label={metric.display_name}
            dir={direction}
          />
        </div>
      )}

      {slot ? <div className="mt-1">{slot}</div> : null}
    </Panel>
  );
}

// Pro 전용 raw 레벨 — latest/sma 정량 노출. null 항목은 생략(가짜 수치 금지).
function ProRawValues({ metric }: { metric: TickerMetric }) {
  const rows: { label: string; value: number }[] = [];
  if (typeof metric.latest === "number") {
    rows.push({ label: "현재가", value: metric.latest });
  }
  if (typeof metric.trend.sma5 === "number") {
    rows.push({ label: "5일선", value: metric.trend.sma5 });
  }
  if (typeof metric.trend.sma20 === "number") {
    rows.push({ label: "20일선", value: metric.trend.sma20 });
  }

  if (rows.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">상세 수치 준비중</p>
    );
  }

  return (
    <dl className="grid grid-cols-3 gap-2">
      {rows.map((r) => (
        <div key={r.label} className="flex flex-col">
          <dt className="text-[11px] text-muted-foreground">{r.label}</dt>
          <dd className="text-sm font-semibold tabular-nums text-foreground">
            {r.value.toLocaleString(undefined, {
              maximumFractionDigits: 2,
            })}
          </dd>
        </div>
      ))}
    </dl>
  );
}

// ── 외국인 수급 변형 ─────────────────────────────────────────────────────────
// 기존 ForeignFlowCard 동작 보존: available 여부 분기, 미수집 '준비중', 방향/연속일 요약,
// raw 금액 레벨 비노출(가짜 숫자 금지).
export interface ForeignFlowMetricProps {
  flow: ForeignFlowStub;
  className?: string;
}

export function ForeignFlowMetric({ flow, className }: ForeignFlowMetricProps) {
  if (!flow.available) {
    return (
      <Panel tone="muted" className={className}>
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-muted-foreground">
            외국인 수급
          </p>
          <Chip variant="muted" className="rounded-full px-2.5">
            준비중
          </Chip>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          {flow.note}
        </p>
      </Panel>
    );
  }

  const days = flow.consecutive_sell_days;
  const summary =
    typeof days === "number" && days > 0
      ? `최근 ${days}일 연속 순매도 흐름이 관찰됩니다.`
      : flow.note;

  return (
    <Panel className={className}>
      <p className="text-sm font-medium text-foreground">외국인 수급</p>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        {summary}
      </p>
    </Panel>
  );
}
