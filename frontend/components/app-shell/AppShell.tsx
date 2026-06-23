import type { ReactNode } from "react";
import Link from "next/link";
import { Sidebar, MobileNav } from "@/components/app-shell/Sidebar";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { LogoutButton } from "@/components/LogoutButton";
import { UpgradeButton } from "@/components/billing/UpgradeButton";
import { ManageSubscriptionButton } from "@/components/billing/ManageSubscriptionButton";
import { Button } from "@/components/ui/button";
import type { Tier } from "@/lib/types";

// 넓은 앱 셸 — 좌측 사이드바 + 상단 바(테마/티어/구독/로그아웃) + 넓은 콘텐츠.
// 페이지들은 이 셸로 감싸고 콘텐츠만 넣는다(한 페이지에 몰지 않음).
// isAuthed=false(게스트)면 티어 배지·업그레이드·로그아웃 대신 로그인/가입 CTA 를 보인다
// — 게스트에게 'Free 회원' 오인 표시나 무의미한 로그아웃을 노출하지 않기 위함.
export function AppShell({
  tier,
  children,
  fullBleed = false,
  isAuthed = true,
}: {
  tier: Tier;
  children: ReactNode;
  fullBleed?: boolean;
  isAuthed?: boolean;
}) {
  return (
    <div className="flex w-full">
      <Sidebar isAuthed={isAuthed} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-border px-4 py-3 md:px-8">
          <span className="font-semibold tracking-tight md:hidden">THESIS</span>
          <div className="ml-auto flex items-center gap-2">
            {isAuthed ? (
              <>
                <span className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  {tier === "pro" ? "Pro" : "Free"}
                </span>
                {tier === "pro" ? (
                  <ManageSubscriptionButton />
                ) : (
                  <UpgradeButton label="Pro 업그레이드" size="sm" />
                )}
                <ThemeToggle />
                <LogoutButton />
              </>
            ) : (
              <>
                <ThemeToggle />
                <Link href="/login" className="hidden sm:block">
                  <Button variant="ghost" size="sm">
                    로그인
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button size="sm">무료로 시작</Button>
                </Link>
              </>
            )}
          </div>
        </header>
        <MobileNav isAuthed={isAuthed} />
        <main
          className={
            fullBleed
              ? "flex-1"
              : "mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-8 md:py-8"
          }
        >
          {children}
        </main>
      </div>
    </div>
  );
}
