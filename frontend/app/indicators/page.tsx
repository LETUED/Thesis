import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getIndicators, getRegime } from "@/lib/api";
import { AppShell } from "@/components/app-shell/AppShell";
import { IndicatorsBoard } from "@/components/dashboard/IndicatorsBoard";
import type { MarketSnapshot, Tier } from "@/lib/types";

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

  // tier 는 서버가 검증한 값에서만 도출(클라이언트 신뢰 금지).
  let tier: Tier = "free";
  try {
    const r = await getRegime("free", token);
    tier = r.tier;
  } catch {
    // 국면 조회 실패해도 지표 보드는 free 로 계속 렌더.
  }

  const snapshot: MarketSnapshot | null = await getIndicators(
    "free",
    undefined,
    token,
  ).catch(() => null);

  return (
    <AppShell tier={tier}>
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">지표 상세</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            매크로 흐름을 레이어별로 모아, 각 지표의 방향과 추세를 차분히
            살펴봅니다.
          </p>
        </header>

        <p className="rounded-lg border border-border bg-surface-2 px-4 py-3 text-sm text-muted-foreground">
          Free 에서는 방향·추세 요약만 제공됩니다. 지표별 상세 수치는 Pro 에서
          제공될 예정입니다.
        </p>

        <IndicatorsBoard snapshot={snapshot} />
      </div>
    </AppShell>
  );
}
