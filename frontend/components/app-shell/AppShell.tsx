import type { ReactNode } from "react";
import { Sidebar, MobileNav } from "@/components/app-shell/Sidebar";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { LogoutButton } from "@/components/LogoutButton";
import { UpgradeButton } from "@/components/billing/UpgradeButton";
import { ManageSubscriptionButton } from "@/components/billing/ManageSubscriptionButton";
import type { Tier } from "@/lib/types";

// 넓은 앱 셸 — 좌측 사이드바 + 상단 바(테마/티어/구독/로그아웃) + 넓은 콘텐츠.
// 페이지들은 이 셸로 감싸고 콘텐츠만 넣는다(한 페이지에 몰지 않음).
export function AppShell({
  tier,
  children,
  fullBleed = false,
}: {
  tier: Tier;
  children: ReactNode;
  fullBleed?: boolean;
}) {
  return (
    <div className="flex w-full">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-border px-4 py-3 md:px-8">
          <span className="font-semibold tracking-tight md:hidden">THESIS</span>
          <div className="ml-auto flex items-center gap-2">
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
          </div>
        </header>
        <MobileNav />
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
