import * as React from "react";
import { ConclusionCard } from "@/components/conclusion/ConclusionCard";
import { ConfidenceMeter } from "@/components/conclusion/ConfidenceMeter";
import { Chip } from "@/components/ui/chip";
import { LockedValue } from "@/components/ui/locked-value";
import { cn } from "@/lib/utils/cn";
import { BLOCKS, type Company, type MetricResult, type Tone } from "@/lib/lab/data";
import type { CompanyFundamentals, Tier } from "@/lib/types";

// 기업분석 평결 카드(docs/09 완결성#1). 차원별 등급(양호/보통/주의) 칩을 집계해
// 정성 평결(ConclusionCard) + ConfidenceMeter(등급 분포)로 렌더한다.
// 핵심 경계: Free = 평결 + 등급 칩(정성)만 / Pro = raw 재무 수치 노출(Free 자리엔 LockedValue).
// 과신방지: 특정 종목 매수·매도 권유 절대 금지("이런 재무 신호가 있습니다" 톤).

// 평결에 집계할 차원(BLOCKS의 id). 임계값은 lib/lab/data.ts BLOCKS 안에 출처 주석과 함께
// 단일 출처로 둔다(CLAUDE.md ROE>15%·영업이익률>20% 등). 여기선 '어떤 차원을 평결에 쓸지'만 고른다.
const VERDICT_DIMENSION_IDS = [
  "roe", // 수익성 — ROE≥15% 양호
  "opMargin", // 수익성 — 영업이익률≥20% 양호
  "netMargin", // 수익성 — 순이익률≥10% 양호
  "growth", // 성장성 — 매출성장 YoY≥20% 양호
  "per", // 밸류 — PER≤15배 양호
  "debtToEquity", // 재무건전성 — 부채비율≤100% 양호
] as const;

// 평결 임계(등급 분포 → 정성 평결). 보수적·일반적 기준:
//  · 주의(watch)가 양호(good)보다 많으면 "주의 신호" / 양호가 우세하면 "양호 우세" / 그 외 "혼재".
// 게임화·점수 노출 금지 — 분포는 텍스트 평결과 확신도 막대로만 표현한다.
type Verdict = "favorable" | "mixed" | "cautious";

interface VerdictCopy {
  headline: string;
  confidenceLabel: string;
}

const VERDICT_COPY: Record<Verdict, VerdictCopy> = {
  favorable: {
    headline: "재무 신호가 대체로 양호한 편입니다",
    confidenceLabel: "양호 신호 우세",
  },
  mixed: {
    headline: "양호한 지표와 살펴볼 지표가 섞여 있습니다",
    confidenceLabel: "신호 혼재",
  },
  cautious: {
    headline: "살펴봐야 할 재무 신호가 있습니다",
    confidenceLabel: "주의 신호 있음",
  },
};

// 등급 분포 → 정성 평결 + 확신도 레벨. good 가 많을수록 신호가 한쪽으로 모이므로 강하게 본다.
function deriveVerdict(tones: Tone[]): {
  verdict: Verdict;
  level: "weak" | "moderate" | "strong";
} {
  const good = tones.filter((t) => t === "good").length;
  const watch = tones.filter((t) => t === "watch").length;
  const total = tones.length;

  const verdict: Verdict =
    watch > good ? "cautious" : good > watch ? "favorable" : "mixed";

  // 확신도: 한쪽(양호/주의)으로 쏠릴수록 강함. 절반 미만이면 약함(혼재 신호).
  const dominant = Math.max(good, watch);
  const level: "weak" | "moderate" | "strong" =
    total === 0 || dominant <= total * 0.5
      ? "weak"
      : dominant >= total * 0.75
        ? "strong"
        : "moderate";

  return { verdict, level };
}

// lab Tone → 표시 색/라벨(접근성: 색 단독 금지 → 라벨 텍스트 병기).
// BlockLab.tsx 인라인 TONE 과 동일 의미(good=양호/neutral=보통/watch=주의) — 색은 시맨틱 토큰.
const TONE_STYLE: Record<Tone, { dot: string; label: string }> = {
  good: { dot: "bg-regime-on", label: "양호" },
  neutral: { dot: "bg-regime-neutral", label: "보통" },
  watch: { dot: "bg-regime-off", label: "주의" },
};

// CompanyFundamentals(snake_case, null 가능) → lab Company(BLOCKS.compute 입력).
// 누락 수치는 가짜값 금지 원칙에 따라 그대로 살리되, BLOCKS 계산에 필요한 number 자리는
// 0 으로 두지 않고 null 가능 필드는 별도 보존한다(roe 만 null 허용 — 나머지는 누락 시 차원 생략).
type MaybeFundamental = number | null | undefined;

interface NormalizedCompany {
  company: Company;
  // 차원별 '수치 자체가 누락'인지(가짜 0 으로 채우지 않기 위해). id → 누락여부.
  missing: Set<string>;
}

function isLabCompany(c: CompanyFundamentals | Company): c is Company {
  // lab Company 는 camelCase forwardPer 를 가진다(CompanyFundamentals 는 forward_per).
  return "forwardPer" in c;
}

const num = (v: MaybeFundamental): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

// 입력을 BLOCKS.compute 가 먹는 Company 로 정규화. 누락 차원은 missing 에 표시해 칩에서 생략.
function normalize(input: CompanyFundamentals | Company): NormalizedCompany {
  const missing = new Set<string>();

  if (isLabCompany(input)) {
    // lab Company: roe 만 null 가능. 그 외는 number(이미 보강됨).
    if (input.roe === null) missing.add("roe");
    return { company: input, missing };
  }

  // CompanyFundamentals: 각 차원 누락 여부를 기록하고, 계산용으로만 0 대입(칩은 missing 으로 생략).
  const fields: { id: string; raw: MaybeFundamental }[] = [
    { id: "roe", raw: input.roe },
    { id: "opMargin", raw: input.op_margin },
    { id: "netMargin", raw: input.net_margin },
    { id: "growth", raw: input.revenue_growth },
    { id: "per", raw: input.forward_per },
    { id: "debtToEquity", raw: input.debt_to_equity },
  ];
  for (const f of fields) if (num(f.raw) === null) missing.add(f.id);

  const company: Company = {
    id: input.id,
    name: input.name || input.ticker,
    ticker: input.ticker,
    yahoo: input.yahoo,
    exchange: input.exchange,
    country: input.country,
    aliases: input.aliases,
    source: input.source,
    period: input.period || undefined,
    forwardPer: num(input.forward_per) ?? 0,
    roe: num(input.roe),
    opMargin: num(input.op_margin) ?? 0,
    revenueGrowth: num(input.revenue_growth) ?? 0,
    netMargin: num(input.net_margin) ?? 0,
    pbr: num(input.pbr) ?? 0,
    debtToEquity: num(input.debt_to_equity) ?? 0,
    dividendYield: num(input.dividend_yield) ?? 0,
  };

  return { company, missing };
}

interface DimensionGrade {
  id: string;
  name: string;
  result: MetricResult;
}

export interface CompanyVerdictCardProps
  extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  // 기업 재무 데이터(백엔드 CompanyFundamentals 또는 lab Company).
  company: CompanyFundamentals | Company;
  tier: Tier;
}

export function CompanyVerdictCard({
  company: input,
  tier,
  className,
  ...props
}: CompanyVerdictCardProps) {
  const { company, missing } = normalize(input);
  const isPro = tier === "pro";
  const period = company.period;

  // 차원별 등급 — BLOCKS(임계값 단일출처)로 계산. 수치 누락(missing) 차원은 차분히 생략.
  const grades: DimensionGrade[] = VERDICT_DIMENSION_IDS.map(
    (id): DimensionGrade | null => {
      const block = BLOCKS.find((b) => b.id === id);
      if (!block || missing.has(id)) return null;
      // roe 는 BLOCKS 내부에서 null 을 직접 처리(데이터 없음) — 그 경우도 missing 으로 흡수됨.
      return { id, name: block.name, result: block.compute(company) };
    },
  ).filter((g): g is DimensionGrade => g !== null);

  const { verdict, level } = deriveVerdict(grades.map((g) => g.result.tone));
  const copy = VERDICT_COPY[verdict];

  const goodCount = grades.filter((g) => g.result.tone === "good").length;
  const watchCount = grades.filter((g) => g.result.tone === "watch").length;

  return (
    <ConclusionCard
      eyebrow="기업분석 · 재무 평결"
      label={{ text: `${company.name} · ${company.ticker}` }}
      headline={copy.headline}
      disclaimer="여러 재무 지표를 정성적으로 묶어 본 참고용 평결입니다. 매수·매도 신호가 아니며, 한 시점의 데이터에 기반합니다."
      className={cn(className)}
      confidence={
        grades.length > 0 ? (
          <ConfidenceMeter
            level={level}
            label={copy.confidenceLabel}
            rationale={`살펴본 ${grades.length}개 지표 중 양호 ${goodCount} · 주의 ${watchCount}`}
          />
        ) : undefined
      }
      {...props}
    >
      {grades.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          이 기업의 재무 지표를 아직 불러올 수 없어요. 다른 기업을 살펴보거나
          잠시 후 다시 시도해 주세요.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {grades.map((g) => {
            const style = TONE_STYLE[g.result.tone];
            return (
              <li
                key={g.id}
                className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/30 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn("h-2 w-2 shrink-0 rounded-full", style.dot)}
                      aria-hidden
                    />
                    <span className="truncate text-sm font-medium text-foreground">
                      {g.name}
                    </span>
                  </div>
                  <p className="mt-0.5 pl-4 text-xs leading-relaxed text-muted-foreground">
                    {g.result.note}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {/* 정성 등급 칩(Free·Pro 공통) — 색 단독 금지 → 라벨 텍스트 병기 */}
                  <Chip variant="outline" className="gap-1.5">
                    <span
                      className={cn("h-1.5 w-1.5 rounded-full", style.dot)}
                      aria-hidden
                    />
                    {style.label}
                  </Chip>
                  {/* raw 수치: Pro 만 노출. Free 는 LockedValue(가짜값 금지) */}
                  {isPro ? (
                    <span className="min-w-[3.5rem] text-right text-sm font-medium tabular-nums text-foreground">
                      {g.result.display}
                    </span>
                  ) : (
                    <LockedValue label={g.name} />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {period ? (
        <p className="text-[11px] text-muted-foreground">기준 {period}</p>
      ) : null}

      {!isPro && grades.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          정확한 재무 수치(PER·ROE 등)는 Pro에서 펼쳐 볼 수 있어요. 결론과 등급은
          무료로 제공됩니다.
        </p>
      ) : null}
    </ConclusionCard>
  );
}
