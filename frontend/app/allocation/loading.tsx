import { Skeleton } from "@/components/ui/skeleton";
import { AppShellSkeleton } from "@/components/app-shell/AppShellSkeleton";

// 라우트 로딩 UI — 자산배분 페이지(국면 tier 확인 + 패널)가 잠시 걸릴 수 있어,
// 레이아웃(PageConclusion + 결론/도넛 패널)을 닮은 스켈레톤을 즉시 보여준다(스피너 대신).
// AppShellSkeleton 으로 감싸 사이드바·상단바가 미리 자리잡게 해 첫 로드 점프를 없앤다.
export default function AllocationLoading() {
  return (
    <AppShellSkeleton>
      <div className="space-y-6">
      {/* PageConclusion (결론 헤더) */}
      <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-6 w-80" />
        </div>
      </div>

      <Skeleton className="h-4 w-72" /> {/* 안내 문단 */}

      {/* AllocationPanel — 폼(기간·성향) + 결론/도넛 */}
      <div className="space-y-6 rounded-xl border border-border bg-card p-6">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-56" />
        </div>

        {/* 투자 기간 3버튼 */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <div className="grid grid-cols-3 gap-2">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        </div>

        {/* 투자 성향 슬라이더 */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-6 w-full" />
        </div>

        <Skeleton className="h-10 w-full" /> {/* 실행 버튼 */}
        <Skeleton className="h-48 w-full rounded-md" /> {/* 도넛/결론 자리 */}
      </div>

      <Skeleton className="h-16 w-full" /> {/* NextStep */}
      </div>
    </AppShellSkeleton>
  );
}
