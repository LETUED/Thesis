import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, FlaskConical, BarChart3, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ApiError, getRegime, getIndicators, postAllocation } from "@/lib/api";
import { AppShell } from "@/components/app-shell/AppShell";
import { RegimeSignalCard } from "@/components/RegimeSignalCard";
import { OverconfidenceBanner } from "@/components/OverconfidenceBanner";
import { ErrorState } from "@/components/ErrorState";
import { StaleNotice } from "@/components/StaleNotice";
import { SessionWatch } from "@/components/SessionWatch";
import { DisclaimerBanner } from "@/components/DisclaimerBanner";
import { RegimeSpectrum } from "@/components/dashboard/RegimeSpectrum";
import { KoreaMacroBoard } from "@/components/dashboard/KoreaMacroBoard";
import { AllocationDonut } from "@/components/AllocationDonut";
import { UpgradeButton } from "@/components/billing/UpgradeButton";
import { GlanceHub } from "@/components/glance/GlanceHub";
import { NoticeBanner } from "@/components/ui/notice-banner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type {
  AllocationResult,
  MarketSnapshot,
  RegimeResult,
  Tier,
} from "@/lib/types";

// 섹션 구분 라벨 — Top-Down 흐름(①매크로 → ②한국지표 → ③자산배분 → ④기업)을 시각적으로 뚜렷하게.
function SectionLabel({ n, title }: { n: string; title: string }) {
  return (
    <div className="mb-4 flex items-center gap-2.5">
      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-muted text-xs font-semibold tabular-nums text-muted-foreground">
        {n}
      </span>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
    </div>
  );
}

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

  // 셋은 서로 독립(토큰만 공유) → 병렬로 실행해 TTFB를 합산이 아닌 최댓값으로. 각자 실패는 null 폴백.
  // 현 국면 기준 기본 배분(중기·중립) 스냅샷 — 대시보드엔 결론(도넛)만, 조정은 /allocation 에서.
  const [regimeR, snapshotR, allocationR] = await Promise.allSettled([
    getRegime("free", token),
    getIndicators("free", undefined, token),
    postAllocation(
      {
        risk_tolerance: "moderate",
        horizon: "mid",
        reflect_current_regime: true,
        tier: "free",
      },
      token,
    ),
  ]);

  const regime: RegimeResult | null =
    regimeR.status === "fulfilled" ? regimeR.value : null;
  const regimeError: string | null =
    regimeR.status === "rejected"
      ? regimeR.reason instanceof ApiError
        ? regimeR.reason.message
        : "일시적으로 데이터를 제공할 수 없습니다."
      : null;
  const snapshot: MarketSnapshot | null =
    snapshotR.status === "fulfilled" ? snapshotR.value : null;
  const allocation: AllocationResult | null =
    allocationR.status === "fulfilled" ? allocationR.value : null;

  // tier 는 regime 우선, 실패 시 allocation 의 JWT 검증 tier 로 폴백 — 둘 중 하나만 살아도
  // Pro 유저에게 업그레이드 CTA 가 잘못 노출되지 않게.
  const tier: Tier = regime?.tier ?? allocation?.tier ?? "free";
  const isFree = tier === "free";

  return (
    <AppShell tier={tier}>
      <div className="space-y-10">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">오늘</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            오늘 시장이 어떤 국면인지, 결론부터 2초 안에 확인하세요.
          </p>
        </header>

        <SessionWatch />
        {regime?.cache_status === "stale" ? <StaleNotice /> : null}
        <OverconfidenceBanner />

        {/* 2초 글랜스 — 결론만 한눈에, 근거·조정은 아래 detail 섹션으로 */}
        <GlanceHub regime={regime} snapshot={snapshot} allocation={allocation} />

        {/* ① 매크로 · 시장 국면 — 결론(국면) 상세 */}
        <section id="section-regime" className="scroll-mt-6">
          <SectionLabel n="1" title="매크로 · 시장 국면" />
          <div className="space-y-5">
            {regime ? <RegimeSpectrum data={regime} /> : null}
            {regime ? (
              <RegimeSignalCard data={regime} />
            ) : (
              <ErrorState message={regimeError ?? undefined} />
            )}
          </div>
        </section>

        {/* ② 한국 1순위 지표 */}
        <section id="section-korea" className="scroll-mt-6">
          <SectionLabel n="2" title="한국 1순위 지표" />
          <div className="grid gap-5 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <KoreaMacroBoard snapshot={snapshot} tier={tier} />
            </div>
            <Card className="flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3
                    className="h-4 w-4 text-muted-foreground"
                    aria-hidden
                  />
                  매크로 지표 16종
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  달러·금리·변동성까지 16개 지표의 추세와 원시 수치는 지표 상세에서
                  확인할 수 있어요.
                </p>
                <div className="mt-auto pt-4">
                  {isFree ? (
                    <UpgradeButton label="Pro로 지표 상세 보기" size="sm" />
                  ) : (
                    <Link href="/indicators">
                      <Button variant="outline" size="sm" className="gap-2">
                        지표 상세 보기
                        <ArrowRight className="h-4 w-4" aria-hidden />
                      </Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* ③ 자산배분 (참고) */}
        <section id="section-allocation" className="scroll-mt-6">
          <SectionLabel n="3" title="자산배분 (참고)" />
          <div className="grid gap-5 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">
                  현 국면 기준 배분 (참고)
                </CardTitle>
                {allocation ? (
                  <p className="text-sm text-muted-foreground">
                    {allocation.conclusion.headline}
                  </p>
                ) : null}
              </CardHeader>
              <CardContent className="space-y-4">
                {allocation ? (
                  <>
                    <AllocationDonut
                      mix={allocation.conclusion.mix}
                      centerText={allocation.conclusion.risk_label_text}
                    />
                    {allocation.conclusion.sector_tilts_summary.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {allocation.conclusion.sector_tilts_summary.map(
                          (s, i) => (
                            <span
                              key={`${s}-${i}`}
                              className="rounded-md border border-border bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground"
                            >
                              {s}
                            </span>
                          ),
                        )}
                      </div>
                    ) : null}
                    <Link href="/allocation">
                      <Button variant="outline" size="sm" className="gap-2">
                        기간·성향 바꿔보기
                        <ArrowRight className="h-4 w-4" aria-hidden />
                      </Button>
                    </Link>
                    <DisclaimerBanner text={allocation.disclaimer} />
                  </>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      투자 기간과 성향을 고르면, 현재 국면을 반영한 주식·현금·안전자산
                      비율과 그 근거를 보여드립니다.
                    </p>
                    <Link href="/allocation">
                      <Button className="gap-2">
                        자산배분 살펴보기
                        <ArrowRight className="h-4 w-4" aria-hidden />
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Lock className="h-4 w-4 text-muted-foreground" aria-hidden />
                  근거까지 펼쳐보기
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  각 배분 판단을 만든 지표별 기여도와 국면·한국 시장 신호는
                  Pro에서 모두 펼쳐집니다.
                </p>
                <div className="mt-auto pt-4">
                  {isFree ? (
                    <UpgradeButton label="Pro 업그레이드" size="sm" />
                  ) : (
                    <Link href="/allocation">
                      <Button variant="outline" size="sm" className="gap-2">
                        상세 근거 보기
                        <ArrowRight className="h-4 w-4" aria-hidden />
                      </Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* ④ 기업 분석 */}
        <section>
          <SectionLabel n="4" title="기업 분석" />
          <div className="grid gap-5 sm:grid-cols-2">
            <Card className="flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FlaskConical
                    className="h-4 w-4 text-muted-foreground"
                    aria-hidden
                  />
                  조립 분석
                  <span className="rounded bg-regime-on/15 px-1.5 py-0.5 text-[10px] font-medium text-regime-on">
                    beta
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  기업을 검색해 PER·ROE 등 재무 지표를 블록으로 연결하고, 여러
                  기업을 한눈에 비교해 보세요.
                </p>
                <div className="mt-auto pt-4">
                  <Link href="/lab">
                    <Button variant="outline" size="sm" className="gap-2">
                      조립 분석 열기
                      <ArrowRight className="h-4 w-4" aria-hidden />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            <Card className="flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  종목 스크리너
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    준비중
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  국면과 자산배분 안에서 어떤 종목을 볼지, 지표로 좁혀 찾는
                  스크리너를 준비하고 있어요.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <NoticeBanner tone="shield" role="note" className="text-xs">
          THESIS의 모든 결론은 여러 지표를 종합한 참고용 정보이며, 특정 종목·자산의
          매수·매도를 권유하지 않습니다. 투자 판단과 책임은 본인에게 있습니다.
        </NoticeBanner>
      </div>
    </AppShell>
  );
}
