import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRegime } from "@/lib/api";
import { AppShell } from "@/components/app-shell/AppShell";
import { AllocationPanel } from "@/components/AllocationPanel";
import type { Tier } from "@/lib/types";

export default async function AllocationPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirectedFrom=/allocation");

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;

  let tier: Tier = "free";
  try {
    const regime = await getRegime("free", token);
    tier = regime.tier;
  } catch {
    tier = "free";
  }

  return (
    <AppShell tier={tier}>
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">자산배분</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            투자 기간과 성향을 고르면, 현재 국면을 반영한 주식·현금·안전자산
            비율의 근거를 살펴봅니다.
          </p>
        </header>

        <div className="mx-auto w-full max-w-2xl">
          <AllocationPanel tier={tier} />
        </div>
      </div>
    </AppShell>
  );
}
