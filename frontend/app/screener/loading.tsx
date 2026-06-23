import { Skeleton } from "@/components/ui/skeleton";
import { AppShellSkeleton } from "@/components/app-shell/AppShellSkeleton";

// 라우트 로딩 UI — 기업분석(국면 tier 확인)이 잠시 걸릴 수 있어,
// 새 레이아웃(헤더 + 검색바 + zero 안내 카드)을 닮은 스켈레톤을 즉시 보여준다(스피너 대신).
// AppShellSkeleton 으로 감싸 사이드바·상단바가 미리 자리잡게 해 첫 로드 점프를 없앤다.
export default function ScreenerLoading() {
  return (
    <AppShellSkeleton>
      <div className="space-y-6">
      {/* 헤더 */}
      <div className="space-y-2">
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-4 w-80" />
      </div>

      {/* 검색바 */}
      <Skeleton className="h-11 w-full rounded-lg" />

      {/* zero 상태(teaching) — 아이콘 + 제목 + 설명 + 행동 버튼 */}
      <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-card px-6 py-12 text-center">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <Skeleton className="h-5 w-72" />
        <Skeleton className="h-12 w-full max-w-md" />
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
      </div>
    </AppShellSkeleton>
  );
}
