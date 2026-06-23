import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRegime } from "@/lib/api";
import { AppShell } from "@/components/app-shell/AppShell";
import { MyWatchSection } from "@/components/personalization/MyWatchSection";
import type { Tier } from "@/lib/types";

export default async function PortfolioPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirectedFrom=/portfolio");

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;

  let tier: Tier = "free";
  try {
    const r = await getRegime("free", token);
    tier = r.tier;
  } catch {
    tier = "free";
  }

  return (
    <AppShell tier={tier}>
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">내 관심</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            관심에 담은 기업과 최근 살펴본 기업을 한곳에 모았어요.
          </p>
        </header>

        <MyWatchSection tier={tier} />

        <p className="text-xs leading-relaxed text-muted-foreground">
          참고로, 한 종목에 15%·현금 20% 같은 비중 점검은 자산배분에서 함께
          살펴볼 수 있어요. 여기 모인 기업은 매수·매도 권유가 아니라 살펴보기
          위한 메모예요.
        </p>
      </div>
    </AppShell>
  );
}
