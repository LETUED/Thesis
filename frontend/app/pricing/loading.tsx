import { Skeleton } from "@/components/ui/skeleton";

// 라우트 로딩 UI — 요금제 페이지(PlanComparison: 토글 + 3열 플랜 카드 + 기능 비교표)를
// 닮은 스켈레톤을 즉시 보여준다(스피너 대신).
export default function PricingLoading() {
  return (
    <section className="mx-auto max-w-5xl px-4 pb-12 pt-16">
      {/* 헤더(제목 + 설명) */}
      <div className="mx-auto mb-10 max-w-xl space-y-3 text-center">
        <Skeleton className="mx-auto h-9 w-72" />
        <Skeleton className="mx-auto h-4 w-full max-w-md" />
      </div>

      {/* 결제 주기 토글 */}
      <div className="flex justify-center">
        <Skeleton className="h-10 w-56 rounded-lg" />
      </div>

      {/* 3열 플랜 카드 */}
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex flex-col gap-5 rounded-xl border border-border bg-card p-6"
          >
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-8 w-28" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </div>
            <Skeleton className="mt-2 h-10 w-full" />
          </div>
        ))}
      </div>

      {/* 기능 비교표 */}
      <div className="mt-10 space-y-3">
        <Skeleton className="h-9 w-full" />
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    </section>
  );
}
