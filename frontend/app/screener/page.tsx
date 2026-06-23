import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Building2, PieChart } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getRegime } from "@/lib/api";
import { AppShell } from "@/components/app-shell/AppShell";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { CompanyLookup } from "@/components/company/CompanyLookup";
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
            매크로 국면 위에서 기업을 골라 재무 신호를 살펴보는 화면입니다.
            결론과 등급은 무료, 정확한 수치는 Pro에서 펼쳐 볼 수 있어요.
          </p>
        </header>

        {/* 검색 island — 기업 선택 시 평결 카드를 렌더. 미선택 시 아래 교육형 zero 상태 유지. */}
        <CompanyLookup
          tier={tier}
          zeroState={
            <EmptyState
              variant="teaching"
              icon={<Building2 className="h-5 w-5" aria-hidden />}
              title="국면 → 배분을 먼저 보고 종목을 좁히세요"
              description="위에서 아래로 — 매크로 국면과 자산배분을 먼저 확인하면 어떤 섹터·종목을 살펴볼지 자연스럽게 좁혀져요. 위 검색에서 기업을 고르면 재무 평결이 나타납니다."
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
          }
        />
      </div>
    </AppShell>
  );
}
