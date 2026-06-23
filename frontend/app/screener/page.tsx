import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Building2, PieChart } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getRegime } from "@/lib/api";
import { AppShell } from "@/components/app-shell/AppShell";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { Tier } from "@/lib/types";

export default async function ScreenerPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirectedFrom=/screener");

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;

  let tier: Tier = "free";
  try {
    const r = await getRegime("free", token);
    tier = r.tier;
  } catch {
    // 국면 데이터를 못 받아도 페이지는 동작한다 — 기본 free 유지.
  }

  return (
    <AppShell tier={tier}>
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">기업분석</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            매크로 국면 위에서 섹터와 종목을 살펴보는 화면입니다.
          </p>
        </header>

        <EmptyState
          variant="teaching"
          icon={<Building2 className="h-5 w-5" aria-hidden />}
          title="국면 → 배분을 먼저 보고 종목을 좁히세요"
          description="위에서 아래로 — 매크로 국면과 자산배분을 먼저 확인하면 어떤 섹터·종목을 살펴볼지 자연스럽게 좁혀져요. 종목 스크리닝은 그 흐름 위에서 이어집니다."
          action={
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Link href="/dashboard">
                <Button variant="outline" className="gap-2">
                  <ArrowRight className="h-4 w-4" aria-hidden />
                  국면 보기
                </Button>
              </Link>
              <Link href="/allocation">
                <Button variant="outline" className="gap-2">
                  <PieChart className="h-4 w-4" aria-hidden />
                  자산배분 보기
                </Button>
              </Link>
            </div>
          }
        />
      </div>
    </AppShell>
  );
}
