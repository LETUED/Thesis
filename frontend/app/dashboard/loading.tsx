import { Skeleton } from "@/components/ui/skeleton";
import { AppShellSkeleton } from "@/components/app-shell/AppShellSkeleton";

// 라우트 로딩 UI — 대시보드 SSR(yfinance 수집)이 몇 초 걸릴 수 있어, 레이아웃을
// 닮은 스켈레톤을 즉시 보여 체감 속도를 높인다(스피너 대신).
// AppShellSkeleton 으로 감싸 사이드바·상단바가 미리 자리잡게 해 첫 로드 점프를 없앤다.
export default function DashboardLoading() {
  return (
    <AppShellSkeleton>
      <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-6 w-40 rounded-full" />
        </div>
        <div className="flex flex-col items-end gap-2">
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-8 w-28" />
        </div>
      </div>

      <Skeleton className="h-12 w-full" /> {/* 과신방지 배너 */}
      <Skeleton className="h-20 w-full" /> {/* 국면 스펙트럼 */}
      <Skeleton className="h-48 w-full" /> {/* 국면 결론 카드 */}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>

      <Skeleton className="h-72 w-full" /> {/* 자산배분 패널 */}
      </div>
    </AppShellSkeleton>
  );
}
