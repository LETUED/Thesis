import type { CacheStatus } from "@/lib/types";

// 데이터 신선도 표시 알약. 점멸/애니메이션·상대시간(n분 전) 계산 없음(하이드레이션 안정).
// fresh|cached: 정상 갱신 / stale: 갱신 지연 — 색만으로 의미 전달하지 않도록 라벨 병기.
export function FreshnessChip({ cacheStatus }: { cacheStatus: CacheStatus }) {
  const isStale = cacheStatus === "stale";

  const dotClass = isStale ? "text-regime-off" : "text-regime-on";
  const label = isStale
    ? "갱신 지연 — 최신이 아닐 수 있어요"
    : "실시간 · 30분 주기 갱신";

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground">
      <span className={`h-1.5 w-1.5 rounded-full bg-current ${dotClass}`} aria-hidden />
      {label}
    </span>
  );
}
