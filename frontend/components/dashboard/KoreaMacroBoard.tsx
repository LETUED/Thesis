import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  ForeignFlowStub,
  MarketSnapshot,
  TickerMetric,
  TrendLabel,
} from "@/lib/types";

// 한국 1순위 매크로 미니보드. 프레젠테이션 전용 서버 컴포넌트('use client' 없음).
// 설계철학: raw 레벨 수치(원달러 1,420 / VIX 27.4) 직접 노출 금지 — change_pct(%)·방향·라벨만.
// 색만으로 의미 전달 금지 → 화살표/부호/라벨을 색과 병기, 색은 중립(text-muted-foreground)으로 매수신호 암시 차단.

// trend.label(영문 enum) → 차분한 한국어 라벨. raw enum 직접 노출 금지.
const TREND_TEXT: Record<TrendLabel, string> = {
  uptrend: "상승 추세",
  downtrend: "하락 추세",
  sideways: "횡보",
  insufficient_data: "추세 판단 보류",
};

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

function MacroMiniCard({
  metric,
  fallbackName,
}: {
  metric: TickerMetric | undefined;
  fallbackName: string;
}) {
  // metric 없음 또는 수집 실패 → 차분한 '불러올 수 없음'.
  if (!metric || metric.status === "failed") {
    return (
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-sm font-medium text-foreground">
          {metric?.display_name ?? fallbackName}
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
          <DirectionIcon className="h-4 w-4" aria-hidden />
        ) : null}
        <span className="text-lg font-semibold tabular-nums">
          {changeText}
        </span>
        {hasChange ? (
          <span className="sr-only">
            전일 대비 {direction === "up" ? "상승" : direction === "down" ? "하락" : "보합"}
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="rounded-md border border-border bg-muted/40 px-2 py-0.5 text-xs text-muted-foreground">
          {trendText}
        </span>
        {metric.status === "stale" ? (
          <span className="rounded-md border border-border bg-muted/40 px-2 py-0.5 text-xs text-muted-foreground">
            지연 데이터
          </span>
        ) : null}
      </div>
    </div>
  );
}

function ForeignFlowCard({ flow }: { flow: ForeignFlowStub }) {
  // 외국인수급: 데이터 없음 → '준비중' 정직 표기. 가짜 숫자 금지.
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

  // available=true 인 경우에도 raw 금액 레벨은 노출하지 않고 방향/연속일만 차분히 요약.
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

export function KoreaMacroBoard({
  snapshot,
}: {
  snapshot: MarketSnapshot | null;
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
              <div
                key={i}
                className="rounded-xl border border-border bg-card p-5"
              >
                <p className="text-sm text-muted-foreground">
                  데이터를 불러올 수 없습니다
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {MACRO_SYMBOLS.map(({ symbol, fallbackName }) => (
              <MacroMiniCard
                key={symbol}
                metric={findMetric(snapshot, symbol)}
                fallbackName={fallbackName}
              />
            ))}
            <ForeignFlowCard flow={snapshot.foreign_flow} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
