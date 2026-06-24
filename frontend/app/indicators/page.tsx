import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getIndicators, getRegime } from "@/lib/api";
import { AppShell } from "@/components/app-shell/AppShell";
import { IndicatorsBoard } from "@/components/dashboard/IndicatorsBoard";
import { FreshnessChip } from "@/components/dashboard/FreshnessChip";
import { PageConclusion } from "@/components/glance/PageConclusion";
import { NextStep } from "@/components/glance/NextStep";
import { REGIME_STYLES } from "@/lib/regime";
import type { MarketSnapshot, RegimeResult, Tier } from "@/lib/types";

export default async function IndicatorsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirectedFrom=/indicators");

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;

  // 국면 평결(상단 결론)과 지표 스냅샷은 독립 → 병렬로. 각자 실패해도 free 보드는 계속 렌더.
  const [regimeR, snapshotR] = await Promise.allSettled([
    getRegime("free", token),
    getIndicators("free", undefined, token),
  ]);

  const regime: RegimeResult | null =
    regimeR.status === "fulfilled" ? regimeR.value : null;
  const snapshot: MarketSnapshot | null =
    snapshotR.status === "fulfilled" ? snapshotR.value : null;

  // tier 는 서버가 검증한 값에서만 도출(클라이언트 신뢰 금지).
  const tier: Tier = regime?.tier ?? "free";

  return (
    <AppShell tier={tier}>
      <div className="space-y-6">
        <PageConclusion
          title="② 지표 상세 · 매크로"
          headline={
            regime?.conclusion.headline ??
            "지표를 레이어별로 모아 흐름의 방향을 살펴봅니다."
          }
          label={
            regime
              ? {
                  text: regime.conclusion.label,
                  style: REGIME_STYLES[regime.conclusion.label],
                }
              : undefined
          }
          freshness={
            snapshot ? (
              <FreshnessChip
                cacheStatus={snapshot.cache_status}
                generatedAt={snapshot.generated_at}
              />
            ) : undefined
          }
        />

        <header>
          <p className="text-sm text-muted-foreground">
            매크로 흐름을 레이어별로 모아, 각 지표의 방향과 추세를 차분히
            살펴봅니다.
          </p>
        </header>

        <p className="rounded-lg border border-border bg-surface-2 px-4 py-3 text-sm text-muted-foreground">
          Free 에서는 방향·추세 요약만 제공됩니다. 지표별 상세 수치는 Pro 에서
          제공될 예정입니다.
        </p>

        <IndicatorsBoard snapshot={snapshot} tier={tier} />

        <NextStep
          prevHref="/dashboard"
          prevLabel="대시보드"
          nextHref="/allocation"
          nextLabel="자산배분 보기"
          reason="지표의 방향을 확인했다면, 이 국면을 반영한 주식·현금·안전자산 비율로 이어집니다."
        />
      </div>
    </AppShell>
  );
}
