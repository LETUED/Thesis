"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Activity,
  PieChart,
  FlaskConical,
  Wallet,
  Building2,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

// Top-Down 순서 고정 네비. 활성 라우트 강조(usePathname).
const NAV = [
  { href: "/dashboard", label: "대시보드", icon: LayoutDashboard },
  { href: "/indicators", label: "지표 상세", icon: Activity },
  { href: "/allocation", label: "자산배분", icon: PieChart },
  { href: "/lab", label: "조립 분석", icon: FlaskConical, beta: true },
  { href: "/portfolio", label: "포트폴리오", icon: Wallet, soon: true },
  { href: "/screener", label: "기업분석", icon: Building2, soon: true },
  { href: "/settings", label: "설정", icon: Settings },
] as const;

// 데스크톱 좌측 세로 레일.
export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r border-border bg-card/40 md:flex">
      <div className="px-5 py-5">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 font-semibold tracking-tight"
        >
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-regime-on/15 text-regime-on">
            ◆
          </span>
          THESIS
        </Link>
      </div>
      <nav className="flex-1 space-y-1 px-3 pb-6">
        {NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-regime-on/12 font-medium text-foreground"
                  : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" aria-hidden />
              <span className="flex-1">{item.label}</span>
              {"beta" in item && item.beta ? (
                <span className="rounded bg-regime-on/15 px-1.5 py-0.5 text-[10px] text-regime-on">
                  beta
                </span>
              ) : null}
              {"soon" in item && item.soon ? (
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  준비중
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

// 모바일 상단 가로 스크롤 네비.
export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-border bg-card/40 px-3 py-2 md:hidden">
      {NAV.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition-colors",
              active
                ? "bg-regime-on/12 font-medium text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <item.icon className="h-3.5 w-3.5" aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
