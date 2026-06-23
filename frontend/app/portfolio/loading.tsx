import { Skeleton } from "@/components/ui/skeleton";

// 라우트 로딩 UI — "내 관심"(국면 tier 확인 + 관심/최근 기업 목록)이 잠시 걸릴 수 있어,
// 레이아웃(헤더 + 리스트)을 닮은 스켈레톤을 즉시 보여준다(스피너 대신).
export default function PortfolioLoading() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      {/* 헤더 */}
      <div className="space-y-2">
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* MyWatchSection — 관심에 담은 기업 리스트 */}
      <div className="space-y-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>

      <Skeleton className="h-8 w-full" /> {/* 안내 문단 */}
    </div>
  );
}
