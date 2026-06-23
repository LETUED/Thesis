import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { SHELL_HEADER, SHELL_MAIN, SHELL_SIDEBAR } from "@/components/app-shell/layout";

// AppShell 과 동일한 골격(사이드바 레일 w-56 + 상단바 + max-w-7xl main)을 정적 스켈레톤으로 그린다.
// loading.tsx 가 이걸로 콘텐츠를 감싸면, SSR 대기 중에도 크롬이 자리를 잡아 실제 페이지의
// AppShell 이 렌더될 때 레이아웃 점프가 없다(첫 로드 안정감). auth/tier 불필요한 순수 플레이스홀더.
// 보조기술: 컨테이너 aria-busy, 장식 크롬은 aria-hidden.
export function AppShellSkeleton({ children }: { children: ReactNode }) {
  return (
    <div className="flex w-full" aria-busy="true">
      {/* 좌측 사이드바 레일(데스크톱) — AppShell Sidebar 와 동일 폭/보더(SHELL_SIDEBAR). 패딩은 실제 Sidebar처럼 내부 자식에. */}
      <aside aria-hidden className={SHELL_SIDEBAR}>
        <div className="px-5 py-5">
          <Skeleton className="h-6 w-24" />
        </div>
        <div className="space-y-2 px-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full rounded-lg" />
          ))}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* 상단바 — AppShell header 와 동일(SHELL_HEADER) */}
        <header aria-hidden className={SHELL_HEADER}>
          <div className="ml-auto flex items-center gap-2">
            <Skeleton className="h-7 w-14 rounded-full" />
            <Skeleton className="h-8 w-24" />
          </div>
        </header>

        {/* 모바일 네비 자리(AppShell MobileNav 대응) */}
        <div aria-hidden className="border-b border-border px-3 py-2 md:hidden">
          <Skeleton className="h-7 w-full" />
        </div>

        <main className={SHELL_MAIN}>{children}</main>
      </div>
    </div>
  );
}
