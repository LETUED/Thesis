import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Building2, Construction } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getRegime } from "@/lib/api";
import { AppShell } from "@/components/app-shell/AppShell";
import { Button } from "@/components/ui/button";
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

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-2">
              <Building2
                className="h-6 w-6 text-muted-foreground"
                aria-hidden
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-medium">준비중</h2>
                <span className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  <Construction className="h-3.5 w-3.5" aria-hidden />
                  작업 중
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                국면에 맞는 섹터·종목 스크리닝은 순차 제공 예정입니다. 매크로
                국면과 자산배분을 먼저 살펴보면서 큰 그림을 잡아두세요.
              </p>
              <div className="mt-5">
                <Link href="/dashboard">
                  <Button variant="outline" className="gap-2">
                    대시보드로 가기
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
