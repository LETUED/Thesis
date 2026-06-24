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
// isAuthed=false(익명): 결론 무료 열람 중 — 상단 바를 로그인/회원가입 유도로 바꾼다('로그아웃'은 부적절).
export function AppShell({
  tier,
  isAuthed = true,
  children,
  fullBleed = false,
}: {
  tier: Tier;
  // 기본 true — 로그인 강제 페이지(indicators·lab 등)는 항상 인증 사용자. 익명 가능 페이지만 명시 전달.
  // ⚠️ 새 익명 접근 페이지를 추가하면 반드시 isAuthed 를 전달할 것(기본 true 라 누락 시 익명에 로그아웃 버튼이 잘못 노출됨).
  isAuthed?: boolean;
  children: ReactNode;
  fullBleed?: boolean;
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
