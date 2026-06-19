import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ApiError, getRegime, getIndicators } from "@/lib/api";
import { AppShell } from "@/components/app-shell/AppShell";
import { RegimeSignalCard } from "@/components/RegimeSignalCard";
import { OverconfidenceBanner } from "@/components/OverconfidenceBanner";
import { ErrorState } from "@/components/ErrorState";
import { StaleNotice } from "@/components/StaleNotice";
import { SessionWatch } from "@/components/SessionWatch";
import { FreshnessChip } from "@/components/dashboard/FreshnessChip";
import { RegimeSpectrum } from "@/components/dashboard/RegimeSpectrum";
import { KoreaMacroBoard } from "@/components/dashboard/KoreaMacroBoard";
import { NudgeCard } from "@/components/dashboard/NudgeCard";
import { Button } from "@/components/ui/button";
import type { MarketSnapshot, RegimeResult, Tier } from "@/lib/types";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirectedFrom=/dashboard");

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;

  let regime: RegimeResult | null = null;
  let regimeError: string | null = null;
  try {
    regime = await getRegime("free", token);
  } catch (e) {
    regimeError =
      e instanceof ApiError
        ? e.message
        : "일시적으로 데이터를 제공할 수 없습니다.";
  }

  let snapshot: MarketSnapshot | null = null;
  try {
    snapshot = await getIndicators("free", undefined, token);
  } catch {
    snapshot = null;
  }

  const tier: Tier = regime?.tier ?? "free";

  return (
    <AppShell tier={tier}>
      <div className="space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">대시보드</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              매크로 국면을 먼저 보고, 그 위에서 자산배분을 살펴봅니다.
            </p>
          </div>
          {regime ? <FreshnessChip cacheStatus={regime.cache_status} /> : null}
        </header>

        <SessionWatch />
        {regime?.cache_status === "stale" ? <StaleNotice /> : null}
        <OverconfidenceBanner />

        {/* 매크로 국면 — 스펙트럼(전폭) */}
        {regime ? <RegimeSpectrum data={regime} /> : null}

        {/* 넓은 2열: 국면 결론 | 한국 매크로 보드 */}
        <div className="grid gap-6 lg:grid-cols-2">
          {regime ? (
            <RegimeSignalCard data={regime} />
          ) : (
            <ErrorState message={regimeError ?? undefined} />
          )}
          <KoreaMacroBoard snapshot={snapshot} />
        </div>

        {/* 넓은 2열: 넛지 | 자산배분 안내 */}
        <div className="grid gap-6 lg:grid-cols-2">
          {regime ? <NudgeCard data={regime} /> : <div />}
          <div className="flex flex-col justify-between rounded-xl border border-border bg-card p-5">
            <div>
              <h3 className="text-lg font-medium">자산배분 살펴보기</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                투자 기간과 성향을 고르면, 현재 국면을 반영한 주식·현금·안전자산
                비율의 근거를 보여드립니다.
              </p>
            </div>
            <div className="mt-5">
              <Link href="/allocation">
                <Button className="gap-2">
                  자산배분으로 가기
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
