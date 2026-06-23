"use client";

import * as React from "react";
import Link from "next/link";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { Tone } from "@/lib/lab/data";
import type { Tier } from "@/lib/types";
import type { CompanyRef } from "@/lib/personalization/companyId";
import {
  SCREENER_CRITERIA,
  applyScreen,
  type ScreenerRow,
  type ScreenerCriterionId,
} from "@/lib/screener/screen";
import { Panel } from "@/components/ui/panel";
import { Chip } from "@/components/ui/chip";
import { LockedValue } from "@/components/ui/locked-value";
import { WatchlistButton } from "@/components/personalization/WatchlistButton";
import { OverconfidenceBanner } from "@/components/OverconfidenceBanner";

// 게스트(미로그인) 관심 버튼 — 조용한 실패 대신 로그인으로 부드럽게 유도(저장의 가치를 제시).
function GuestWatchLink({ name }: { name: string }) {
  return (
    <Link
      href="/login?redirectedFrom=/screener"
      title={`로그인하면 ${name}을(를) 관심종목에 저장할 수 있어요`}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
    >
      <Star aria-hidden className="h-4 w-4" />
      <span className="sr-only">로그인하고 {name} 관심종목에 저장</span>
    </Link>
  );
}

// 기초 종목 스크리너 보드. 서버가 만든 안전 행(ScreenerRow)을 받아 tone(결론)으로만
// 필터·정렬한다 — raw 수치는 Free 페이로드에 없고, Pro 행에만 displays 로 담겨 온다.
// 경계: 등급(양호/보통/주의)·순위는 Free, raw 수치는 Pro(Free 자리엔 LockedValue).
// 과신방지: 순위는 '결론의 정렬'일 뿐 매수 추천이 아니다(헤더 안내 + 하단 배너).

// 기준 짧은 라벨(토글·정렬·칩 표시용). 임계값은 BLOCKS 단일출처에 있고 여기선 라벨만 둔다.
const CRITERION_LABEL: Record<ScreenerCriterionId, string> = {
  roe: "ROE",
  opMargin: "영업이익률",
  growth: "매출성장",
  per: "PER",
  debtToEquity: "부채비율",
};

// lab Tone → 색 점 + 텍스트 라벨(접근성: 색 단독 금지). CompanyVerdictCard 와 동일 의미.
const TONE_STYLE: Record<Tone, { dot: string; label: string }> = {
  good: { dot: "bg-regime-on", label: "양호" },
  neutral: { dot: "bg-regime-neutral", label: "보통" },
  watch: { dot: "bg-regime-off", label: "주의" },
};

function toRef(row: ScreenerRow): CompanyRef {
  return {
    company_id: row.id,
    ticker: row.ticker,
    name: row.name,
    exchange: row.exchange,
  };
}

export interface ScreenerBoardProps {
  rows: ScreenerRow[];
  tier: Tier;
  isAuthed?: boolean;
}

export function ScreenerBoard({ rows, tier, isAuthed = true }: ScreenerBoardProps) {
  const isPro = tier === "pro";
  const [required, setRequired] = React.useState<Set<ScreenerCriterionId>>(
    () => new Set(),
  );
  const [sortBy, setSortBy] = React.useState<ScreenerCriterionId>("roe");

  const view = React.useMemo(
    () => applyScreen(rows, { required: [...required], sortBy }),
    [rows, required, sortBy],
  );

  function toggle(id: ScreenerCriterionId) {
    setRequired((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <Panel className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">종목 스크리너</h2>
        <p className="text-sm text-muted-foreground">
          매크로 국면 → 자산배분을 먼저 본 뒤, 재무 기준으로 종목을 좁혀 보세요.
          순위는 기준을 잘 충족한 순서일 뿐, 매수 권유가 아닙니다.
        </p>
      </div>

      {/* 기준 토글 — 누른 기준을 모두 통과(등급 양호)한 종목만 남긴다 */}
      <div
        className="flex flex-wrap items-center gap-2"
        role="group"
        aria-label="필터 기준"
      >
        {SCREENER_CRITERIA.map((id) => {
          const active = required.has(id);
          return (
            <button
              key={id}
              type="button"
              onClick={() => toggle(id)}
              aria-pressed={active}
              className={cn(
                "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20",
                active
                  ? "border-transparent bg-foreground text-on-emphasis"
                  : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {CRITERION_LABEL[id]} 양호만
            </button>
          );
        })}
      </div>

      {/* 정렬 + 결과 수 */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <label className="flex flex-wrap items-center gap-2 text-muted-foreground">
          정렬
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as ScreenerCriterionId)}
            className="rounded-md border border-border bg-card px-2 py-1 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
          >
            {SCREENER_CRITERIA.map((id) => (
              <option key={id} value={id}>
                {CRITERION_LABEL[id]}
              </option>
            ))}
          </select>
          {/* 정렬은 raw 수치순이 아니라 해당 기준의 '등급(양호/보통/주의)' 우수 순이다 — 기대 일치용 카피 */}
          <span className="text-xs">등급 좋은 순</span>
        </label>
        <span className="text-xs text-muted-foreground">
          {rows.length}개 중 {view.length}개 표시
        </span>
      </div>

      {/* 결과 */}
      {view.length === 0 ? (
        <p className="rounded-md border border-border bg-muted/30 px-3 py-6 text-center text-sm text-muted-foreground">
          선택한 기준을 모두 통과한 종목이 없어요. 기준을 줄여서 다시 살펴보세요.
        </p>
      ) : (
        <ul className="space-y-2">
          {view.map((row, idx) => (
            <li
              key={row.id}
              className="rounded-md border border-border bg-muted/30 px-3 py-2.5"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="w-5 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <span className="truncate text-sm font-medium text-foreground">
                      {row.name}
                    </span>
                    <span className="ml-1.5 text-xs text-muted-foreground">
                      {row.ticker}
                    </span>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {/* 정렬 기준값: Pro 만 raw 노출(displays), Free 는 LockedValue(수치 미수신) */}
                  {isPro ? (
                    <span className="min-w-[3.5rem] text-right text-sm font-medium tabular-nums text-foreground">
                      {row.displays?.[sortBy] ?? "—"}
                    </span>
                  ) : (
                    <LockedValue label={CRITERION_LABEL[sortBy]} />
                  )}
                  {isAuthed ? (
                    <WatchlistButton company={toRef(row)} tier={tier} size="sm" />
                  ) : (
                    <GuestWatchLink name={row.name} />
                  )}
                </div>
              </div>

              {/* 기준별 등급 칩(Free·Pro 공통, 색 단독 금지 → 라벨 병기) */}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {row.grades.map((g) => {
                  const style = TONE_STYLE[g.tone];
                  return (
                    <Chip key={g.id} variant="outline" className="gap-1.5">
                      <span
                        className={cn("h-1.5 w-1.5 rounded-full", style.dot)}
                        aria-hidden
                      />
                      <span className="text-muted-foreground">
                        {CRITERION_LABEL[g.id]}
                      </span>
                      <span className="font-medium">{style.label}</span>
                    </Chip>
                  );
                })}
              </div>
            </li>
          ))}
        </ul>
      )}

      {!isPro && view.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          순위와 등급은 무료로 제공됩니다. 정확한 재무 수치(ROE·PER 등)는 Pro에서
          펼쳐 볼 수 있어요.
        </p>
      ) : null}

      <OverconfidenceBanner />
    </Panel>
  );
}
