import { ConclusionCard } from "@/components/conclusion/ConclusionCard";
import { ConfidenceMeter } from "@/components/conclusion/ConfidenceMeter";
import { DataProvenance } from "@/components/ui/data-provenance";
import { EvidenceLocked } from "@/components/EvidenceLocked";
import { REGIME_STYLES } from "@/lib/regime";
import { isLocked, type RegimeResult } from "@/lib/types";

// 결론 먼저: label 칩 + headline + 확률 confidence(ConfidenceMeter) + top_drivers 칩.
// evidence 는 free 면 EvidenceLocked, pro 면 상세 근거. '지금 사세요' 금지.
// 골격은 도메인 무관 ConclusionCard 슬롯에 매핑.
export function RegimeSignalCard({ data }: { data: RegimeResult }) {
  const { conclusion, evidence } = data;
  const style = REGIME_STYLES[conclusion.label];

  return (
    <ConclusionCard
      eyebrow="매크로 · 시장 국면"
      label={{
        text: conclusion.label,
        style: { backgroundColor: style.badgeBg, color: style.dot },
      }}
      headline={conclusion.headline}
      drivers={conclusion.top_drivers}
      disclaimer={data.disclaimer}
      provenance={
        <DataProvenance
          generatedAt={data.generated_at}
          source="주요 시장 지표 · Yahoo Finance"
        />
      }
      confidence={
        <ConfidenceMeter
          level={conclusion.confidence.level}
          label={conclusion.confidence.probabilistic_label}
          rationale={conclusion.confidence.rationale}
          fillColor={style.badgeText}
        />
      }
    >
      {/* evidence 분기: 타입가드로 좁힘. raw 비노출 — comparison_text 만 렌더 */}
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
    </ConclusionCard>
  );
}
