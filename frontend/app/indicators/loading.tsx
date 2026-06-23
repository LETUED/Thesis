import { Skeleton } from "@/components/ui/skeleton";
import { AppShellSkeleton } from "@/components/app-shell/AppShellSkeleton";

// 라우트 로딩 UI — 지표 상세 SSR(국면 평결 + 지표 스냅샷 수집)이 몇 초 걸릴 수 있어,
// 레이아웃(PageConclusion + 레이어별 지표 카드 그리드)을 닮은 스켈레톤을 즉시 보여준다(스피너 대신).
// AppShellSkeleton 으로 감싸 사이드바·상단바가 미리 자리잡게 해 첫 로드 점프를 없앤다.
export default function IndicatorsLoading() {
  return (
    <AppShellSkeleton>
      <div className="space-y-6">
      {/* PageConclusion (결론 헤더 + 신선도 칩) */}
      <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-6 w-72" />
        </div>
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>

      <Skeleton className="h-4 w-80" /> {/* 안내 문단 */}
      <Skeleton className="h-12 w-full" /> {/* Free 안내 박스 */}

      {/* 레이어별 지표 카드 그리드 (글로벌 → 한국 → 위험선호 → 섹터·기업) */}
      {[0, 1, 2].map((section) => (
        <div key={section} className="space-y-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-56" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
        </div>
      ))}

      <Skeleton className="h-16 w-full" /> {/* NextStep */}
      </div>
    </AppShellSkeleton>
  );
}
