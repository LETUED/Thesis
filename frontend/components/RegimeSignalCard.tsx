import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DisclaimerBanner } from "@/components/DisclaimerBanner";
import { EvidenceLocked } from "@/components/EvidenceLocked";
import { CONFIDENCE_BARS, REGIME_STYLES } from "@/lib/regime";
import { isLocked, type RegimeResult } from "@/lib/types";

// 결론 먼저: label 배지 + headline + 확률 confidence + top_drivers 칩.
// evidence 는 free 면 EvidenceLocked, pro 면 상세 근거. '지금 사세요' 금지.
export function RegimeSignalCard({ data }: { data: RegimeResult }) {
  const { conclusion, evidence } = data;
  const style = REGIME_STYLES[conclusion.label];
  const bars = CONFIDENCE_BARS[conclusion.confidence.level];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            매크로 · 시장 국면
          </p>
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold"
            style={{ backgroundColor: style.badgeBg, color: style.badgeText }}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: style.dot }}
              aria-hidden
            />
            {conclusion.label}
          </span>
        </div>
        <CardTitle className="mt-2 text-xl leading-snug">
          {conclusion.headline}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* 확신도: 숫자 대신 막대 3칸 + 확률적 라벨 텍스트 */}
        <div>
          <div className="flex items-center gap-3">
            <span className="sr-only">
              확신도{" "}
              {conclusion.confidence.level === "strong"
                ? "강함"
                : conclusion.confidence.level === "moderate"
                  ? "보통"
                  : "약함"}
              {" — "}
              {conclusion.confidence.probabilistic_label}
            </span>
            <div className="flex gap-1" aria-hidden>
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-2 w-8 rounded-full"
                  style={{
                    backgroundColor:
                      i < bars
                        ? style.badgeText
                        : "hsl(var(--muted))",
                  }}
                />
              ))}
            </div>
            <span className="text-sm font-medium">
              {conclusion.confidence.probabilistic_label}
            </span>
          </div>
          {conclusion.confidence.rationale ? (
            <p className="mt-2 text-xs text-muted-foreground">
              {conclusion.confidence.rationale}
            </p>
          ) : null}
        </div>

        {/* 주요 근거 방향(top_drivers) — 수치 없이 칩으로 */}
        {conclusion.top_drivers.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {conclusion.top_drivers.map((d, i) => (
              <span
                key={`${d}-${i}`}
                className="rounded-md border border-border bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground"
              >
                {d}
              </span>
            ))}
          </div>
        ) : null}

        {/* evidence 분기: 타입가드로 좁힘 */}
        {evidence === null ? null : isLocked(evidence) ? (
          <EvidenceLocked data={evidence} />
        ) : (
          <div className="space-y-2 rounded-md border border-border bg-muted/30 p-4">
            <p className="text-sm font-medium">지표별 근거</p>
            <ul className="space-y-1.5">
              {evidence.contributions.map((c) => (
                <li
                  key={c.ticker}
                  className="flex items-start justify-between gap-3 text-xs"
                >
                  <span className="text-muted-foreground">
                    {c.comparison_text}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <DisclaimerBanner text={data.disclaimer} />
      </CardContent>
    </Card>
  );
}
