import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ApiError, getRegime, getIndicators, postAllocation } from "@/lib/api";
import { LandingNav } from "@/components/landing/LandingNav";
import { RegimeSignalCard } from "@/components/RegimeSignalCard";
import { RegimeSpectrum } from "@/components/dashboard/RegimeSpectrum";
import { KoreaTriadStrip } from "@/components/glance/KoreaTriadStrip";
import { AllocationDonut } from "@/components/AllocationDonut";
import { OverconfidenceBanner } from "@/components/OverconfidenceBanner";
import { DisclaimerBanner } from "@/components/DisclaimerBanner";
import { ErrorState } from "@/components/ErrorState";
import { StaleNotice } from "@/components/StaleNotice";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AllocationResult, MarketSnapshot, RegimeResult } from "@/lib/types";

export const metadata: Metadata = {
  title: "지금 시장 국면 — THESIS",
  description:
    "가입 없이 현재 시장 국면 결론과 참고 자산배분을 확인하세요. 매수·매도 권유가 아닙니다.",
};

// 게스트 무가입 열람: 익명=free 국면+자산배분 결론을 SSR 프리페치한다(북극성 ② 진입장벽 제거).
// Pro 근거(원시 수치·지표 기여도)는 백엔드가 EvidenceLocked 로 잠그므로 페이로드에 애초에 부재.
export default async function RegimePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAuthed = user !== null;

  // 게스트는 토큰 없음 → 백엔드 fail-closed FREE. 로그인 사용자(특히 Pro)가 이 공개 경로로 와도
  // 다른 SSR 페이지와 동선이 일치하도록 토큰을 전달한다(tier 는 서버가 토큰 profile 로만 도출).
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;

  // 각자 실패는 null 폴백(페이지 유지).
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

  return (
    <>
      <LandingNav isAuthed={isAuthed} />
      <main className="mx-auto max-w-3xl space-y-8 px-4 py-10">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">지금 시장 국면</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            가입 없이 오늘의 국면 결론과 참고 자산배분을 확인하세요. 지표별 근거는
            가입 후 펼쳐집니다.
          </p>
        </header>

        {regime?.cache_status === "stale" ? <StaleNotice /> : null}
        <OverconfidenceBanner />

        {/* 국면 결론 — 스펙트럼 + 신호 카드(free 면 evidence 자동 잠김) */}
        <section className="space-y-5">
          {regime ? <RegimeSpectrum data={regime} /> : null}
          {regime ? (
            <RegimeSignalCard data={regime} />
          ) : (
            <ErrorState message={regimeError ?? undefined} />
          )}
        </section>

        {/* 한국 1순위 지표 상태 맛보기 — 수치 비노출(상태/방향만, free 마스킹). Top-Down: 국면→한국지표→배분 */}
        {snapshot ? (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              한국 1순위 지표
            </h2>
            <KoreaTriadStrip snapshot={snapshot} />
          </section>
        ) : null}

        {/* 참고 자산배분 결론(도넛만 — 조정·근거는 가입 후 /allocation) */}
        {allocation ? (
          <section>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">현 국면 기준 배분 (참고)</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {allocation.conclusion.headline}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <AllocationDonut
                  mix={allocation.conclusion.mix}
                  centerText={allocation.conclusion.risk_label_text}
                />
                <DisclaimerBanner text={allocation.disclaimer} />
              </CardContent>
            </Card>
          </section>
        ) : null}

        {/* 가입 유도 — 결론은 무료, 근거는 가입 후(설계철학 6) */}
        {!isAuthed ? (
          <section className="rounded-lg border border-border bg-muted/30 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              지표별 기여도와 국면·한국 시장 신호까지, 근거를 모두 펼쳐보려면
            </p>
            <Link href="/signup" className="mt-3 inline-block">
              <Button className="gap-2">
                무료로 가입하고 근거까지 보기
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Button>
            </Link>
          </section>
        ) : null}
      </main>
    </>
  );
}
