import * as React from "react";
import Link from "next/link";
import { Compass, Lightbulb } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { FreshnessChip } from "@/components/dashboard/FreshnessChip";
import { KoreaTriadStrip } from "@/components/glance/KoreaTriadStrip";
import { REGIME_STYLES, REGIME_HINT } from "@/lib/regime";
import type {
  AllocationResult,
  MarketSnapshot,
  RegimeResult,
} from "@/lib/types";

// "오늘" 2초 글랜스 허브. 결론만 한눈에, 근거·조정은 아래 detail 섹션으로 컨텍스트 링크.
// 과신방지 톤 유지(행동 지시 금지). 과밀 방지를 위해 항목 수를 고정한다(결론/한국3종/배분/넛지).
// 프레젠테이션 전용(서버 컴포넌트) — 인터랙션 없음.

// 글랜스 한 항목: 제목 + 컨텍스트 링크(해당 detail 섹션으로 스크롤). 색 단독 의존 없음.
function GlanceRow({
  title,
  href,
  children,
}: {
  title: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2 border-t border-border pt-4 first:border-t-0 first:pt-0">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {title}
        </h3>
        <Link
          href={href}
          className="shrink-0 rounded-md text-xs font-medium text-foreground underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none"
        >
          자세히
          <span aria-hidden="true"> →</span>
        </Link>
      </div>
      {children}
    </div>
  );
}

// 자산배분 한 줄 요약 — 도넛은 아래 detail. 방어/주식 비중을 텍스트로만(수치 라벨은 결론값 그대로).
function allocationLine(allocation: AllocationResult): string {
  const { mix } = allocation.conclusion;
  const defensive = Math.round(mix.cash_pct + mix.safe_pct);
  const stocks = Math.round(mix.stocks_pct);
  return `방어 ${defensive}% · 주식 ${stocks}%`;
}

export interface GlanceHubProps {
  regime: RegimeResult | null;
  snapshot: MarketSnapshot | null;
  allocation: AllocationResult | null;
}

export function GlanceHub({
  regime,
  snapshot,
  allocation,
}: GlanceHubProps) {
  const conclusion = regime?.conclusion ?? null;
  const style = conclusion ? REGIME_STYLES[conclusion.label] : null;
  const NudgeIcon = conclusion?.label === "리스크온" ? Lightbulb : Compass;

  return (
    <Panel as="section" aria-label="오늘 한눈에" className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold tracking-tight text-foreground">
          오늘 한눈에
        </p>
        {regime ? (
          <FreshnessChip
            cacheStatus={regime.cache_status}
            generatedAt={regime.generated_at}
          />
        ) : null}
      </div>

      {/* 1) 국면 결론 한 줄 — label 칩 + headline */}
      <GlanceRow title="시장 국면" href="#section-regime">
        {conclusion && style ? (
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              {/* 스크린리더엔 라벨+풀이를 한 문장으로(a11y) — 시각 풀이 span 은 aria-hidden 으로 중복 청취 제거 */}
              <span
                className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold"
                style={{ backgroundColor: style.badgeBg, color: style.badgeText }}
                aria-label={`${conclusion.label}, ${REGIME_HINT[conclusion.label]}`}
              >
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: style.dot }}
                />
                {conclusion.label}
              </span>
              {/* 입문자용 용어 풀이(철학3) — '리스크온'이 무슨 뜻인지 곁에 병기(시각 전용) */}
              <span className="text-xs text-muted-foreground" aria-hidden="true">
                {REGIME_HINT[conclusion.label]}
              </span>
            </div>
            <p className="text-base font-semibold leading-snug tracking-tight text-foreground">
              {conclusion.headline}
            </p>
            <p className="text-xs text-muted-foreground">
              {conclusion.confidence.probabilistic_label}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            국면 데이터를 불러올 수 없습니다
          </p>
        )}
      </GlanceRow>

      {/* 2) 한국 1순위 3종 스트립 */}
      <GlanceRow title="한국 1순위 지표" href="#section-korea">
        <KoreaTriadStrip snapshot={snapshot} />
      </GlanceRow>

      {/* 3) 자산배분 한 줄 — 도넛은 아래 detail */}
      <GlanceRow title="참고 배분" href="#section-allocation">
        {allocation ? (
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              {allocationLine(allocation)}
            </p>
            <p className="text-xs text-muted-foreground">
              {allocation.conclusion.risk_label_text}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            투자 기간·성향을 고르면 참고 배분을 보여드립니다
          </p>
        )}
      </GlanceRow>

      {/* 4) 넛지 핵심 한 줄 — 점검·살펴보기 톤(행동 지시 금지) */}
      {regime ? (
        <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <NudgeIcon className="h-4 w-4" aria-hidden />
          </span>
          <div className="space-y-1">
            <p className="text-sm leading-relaxed text-foreground">
              오늘 살펴볼 한 가지 — 비중이 한쪽으로 쏠려 있지 않은지 점검해 볼
              시점이에요.
            </p>
            <p className="text-xs text-muted-foreground">
              참고용이며 매수·매도 권유가 아닙니다.
            </p>
          </div>
        </div>
      ) : null}
    </Panel>
  );
}
