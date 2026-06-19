import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Construction, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getRegime } from "@/lib/api";
import { AppShell } from "@/components/app-shell/AppShell";
import { Button } from "@/components/ui/button";
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
          <h1 className="text-2xl font-semibold tracking-tight">포트폴리오</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            보유 종목을 한눈에 모아 리스크를 함께 점검하는 공간입니다.
          </p>
        </header>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex flex-col items-center justify-center px-4 py-14 text-center">
            <div className="relative mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-border bg-surface-2 text-muted-foreground">
              <Wallet className="h-6 w-6" aria-hidden />
              <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background text-muted-foreground">
                <Construction className="h-3.5 w-3.5" aria-hidden />
              </span>
            </div>

            <h2 className="text-lg font-medium">준비 중이에요</h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
              보유 종목 추적은 곧 제공됩니다 — 단일 종목 15%·현금 20% 같은 리스크
              점검을 함께 보여드릴 예정이에요.
            </p>

            <div className="mt-7">
              <Link href="/dashboard">
                <Button variant="outline" className="gap-2">
                  <ArrowLeft className="h-4 w-4" aria-hidden />
                  대시보드로 돌아가기
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
