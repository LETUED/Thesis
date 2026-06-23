"use client";

import * as React from "react";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { TickerMetric, ThresholdHit, Tier } from "@/lib/types";
import {
  evaluateAlerts,
  listAlertEvents,
  type AlertEvent,
} from "@/lib/personalization/alerts";
import { Panel } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill } from "@/components/ui/status-pill";

// 저빈도 다이제스트 — 관심 지표가 경계·위험 구간에 들어선 "최근 돌파"를 한곳에 모아 보여준다.
// 마운트 시 evaluateAlerts(metrics) 로 조회 시점 평가(신규 돌파만 적재) 후 listAlertEvents 로
// 최근 이벤트를 읽어 표시한다. 상단에는 "오늘의 시장 한 줄 브리프"(Finimize 식 결론먼저·저빈도).
// 실시간 푸시·무버(급등락) 톤 금지 — 근거가 바뀐 순간을 차분히 모아 보여줄 뿐이다.
// 규칙이 없거나 이벤트가 없으면 교육형 EmptyState 로 알림을 거는 법을 안내한다.

// AlertEvent.status(string) → StatusPill 이 요구하는 ThresholdHit 로 안전 narrow.
// 돌파만 적재되므로 warn/danger 만 유효, 그 외(이론상 없음)는 calm 으로 폴백해 색 단독 의존 방지.
const STATUS_TO_HIT: Record<string, ThresholdHit> = {
  calm: "calm",
  neutral: "neutral",
  warn: "warn",
  danger: "danger",
};

function toThresholdHit(status: string): ThresholdHit {
  return STATUS_TO_HIT[status] ?? "neutral";
}

// 차분한 시점 표기 — "실시간"을 연상시키는 초/분 단위 카운트다운 대신 날짜 단위.
function formatBreachTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
  }).format(d);
}

export interface DigestListProps {
  briefHeadline?: string;
  metrics: TickerMetric[];
  tier: Tier;
  className?: string;
}

export function DigestList({
  briefHeadline,
  metrics,
  tier,
  className,
}: DigestListProps) {
  // tier 는 공개 계약. 다이제스트 내용은 MVP 에서 등급 무관(돌파 적재는 alerts.ts 가
  // Free 소프트캡으로 이미 게이팅) — 향후 히스토리 보존 기간 차등에 대비해 받아둔다.
  void tier;
  const [events, setEvents] = React.useState<AlertEvent[]>([]);
  const [loaded, setLoaded] = React.useState(false);

  // metrics 식별자 묶음을 의존성으로 — 배열 참조 변동에 과민 반응하지 않게 직렬화 키 사용.
  const metricsKey = React.useMemo(
    () =>
      metrics
        .map((m) => `${m.symbol}:${m.threshold_status ?? ""}`)
        .join("|"),
    [metrics],
  );

  React.useEffect(() => {
    let active = true;
    async function run() {
      // 조회 시점 평가: 신규 돌파만 적재(중복 방지). 실푸시는 후속 APScheduler 가 담당.
      await evaluateAlerts(metrics);
      const recent = await listAlertEvents();
      if (!active) return;
      setEvents(recent);
      setLoaded(true);
    }
    void run();
    return () => {
      active = false;
    };
    // metricsKey 로 입력 변화를 대표(metrics 자체는 매 렌더 새 참조일 수 있음).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metricsKey]);

  // 지표명 매핑 — 이벤트 symbol → 사람이 읽는 이름(없으면 symbol 그대로).
  const nameBySymbol = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const m of metrics) map.set(m.symbol, m.display_name);
    return map;
  }, [metrics]);

  const hasBrief = typeof briefHeadline === "string" && briefHeadline.length > 0;

  return (
    <Panel className={cn("flex flex-col gap-4", className)}>
      <div className="flex flex-col gap-1.5">
        <h3 className="text-sm font-semibold text-foreground">
          오늘의 시장 한 줄 브리프
        </h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {hasBrief
            ? briefHeadline
            : "큰 변화 없이 차분한 흐름입니다. 관심 지표가 경계 구간에 들어서면 여기에 모아 알려드립니다."}
        </p>
      </div>

      <div
        role="status"
        aria-live="polite"
        className="flex flex-col gap-2 border-t border-border pt-4"
      >
        {!loaded ? (
          <p className="text-sm text-muted-foreground">불러오는 중…</p>
        ) : events.length === 0 ? (
          <EmptyState
            variant="teaching"
            icon={<Bell className="h-5 w-5" aria-hidden />}
            title="아직 모인 알림이 없어요"
            description="관심 지표에 임계 알림을 걸면 경계·위험 구간에 들어선 순간을 여기에 모아 보여드려요. 매수·매도 시점이 아니라, 근거가 바뀐 순간을 차분히 알려드립니다."
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {events.map((e) => {
              const name = nameBySymbol.get(e.symbol) ?? e.symbol;
              const when = formatBreachTime(e.created_at);
              return (
                <li
                  key={e.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-1 px-3 py-2.5"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <StatusPill status={toThresholdHit(e.status)} size="sm" />
                    <span className="truncate text-sm font-medium text-foreground">
                      {name}
                    </span>
                  </div>
                  {when ? (
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {when}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Panel>
  );
}
