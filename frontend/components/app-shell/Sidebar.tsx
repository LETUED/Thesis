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
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

// Top-Down 순서 고정 네비. 활성 라우트 강조(usePathname).
// protected: 로그인 게이트(미들웨어 PROTECTED_PREFIXES 와 일치) — 익명에겐 자물쇠로 '가입하면 열림'을 알린다.
// 결론(/dashboard·/allocation)은 protected 없음 = 무료 열람.
export const NAV = [
  { href: "/dashboard", label: "오늘", icon: LayoutDashboard },
  { href: "/indicators", label: "지표 상세", icon: Activity, protected: true },
  { href: "/allocation", label: "자산배분", icon: PieChart },
  { href: "/lab", label: "조립 분석", icon: FlaskConical, beta: true, protected: true },
  { href: "/portfolio", label: "포트폴리오", icon: Wallet, soon: true, protected: true },
  { href: "/screener", label: "기업분석", icon: Building2, protected: true },
  { href: "/settings", label: "설정", icon: Settings, protected: true },
] as const;

// 익명 + 보호 항목이면 자물쇠로 표기(가입 유도). 그 외에는 기존 beta/준비중 칩.
function navBadge(item: (typeof NAV)[number], locked: boolean) {
  if (locked) {
    return (
      <Lock
        className="h-3 w-3 shrink-0 text-muted-foreground"
        aria-label="로그인 후 이용"
      />
    );
  }
  if ("beta" in item && item.beta) {
    return (
      <span className="rounded bg-regime-on/15 px-1.5 py-0.5 text-[10px] text-regime-on">
        beta
      </span>
    );
  }
  if ("soon" in item && item.soon) {
    return (
      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
        준비중
      </span>
    );
  }
  return null;
}

export function isLocked(
  item: (typeof NAV)[number],
  isAuthed: boolean,
): boolean {
  return !isAuthed && "protected" in item && item.protected === true;
}

// 데스크톱 좌측 세로 레일. isAuthed 기본 true — 로그인 강제 페이지는 항상 인증 사용자.
export function Sidebar({ isAuthed = true }: { isAuthed?: boolean }) {
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
          const locked = isLocked(item, isAuthed);
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
              {navBadge(item, locked)}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

// 모바일 상단 가로 스크롤 네비.
export function MobileNav({ isAuthed = true }: { isAuthed?: boolean }) {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-border bg-card/40 px-3 py-2 md:hidden">
      {NAV.map((item) => {
        const active = pathname === item.href;
        const locked = isLocked(item, isAuthed);
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
            {locked ? (
              <Lock className="h-3 w-3 shrink-0" aria-label="로그인 후 이용" />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
