import type { CacheStatus } from "@/lib/types";

// 데이터가 만들어진 시각을 절대표기(Asia/Seoul 고정) — 상대경과("n분 전")·로컬 타임존은
// 서버/클라 불일치로 하이드레이션을 깨므로 피한다. stale 일 때 '얼마나 오래됐는지'를 정직히 보인다.
function formatAsOf(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

// 데이터 신선도 표시 알약. 점멸/애니메이션·상대시간(n분 전) 계산 없음(하이드레이션 안정).
// fresh|cached: 정상 갱신 / stale: 갱신 지연 — 색만으로 의미 전달하지 않도록 라벨 병기.
// generatedAt: 데이터 생성 시각(ISO). stale 일 때 '언제 기준인지'를 병기해 과신 방지(철학5).
export function FreshnessChip({
  cacheStatus,
  generatedAt,
}: {
  cacheStatus: CacheStatus;
  generatedAt?: string;
}) {
  const isStale = cacheStatus === "stale";

  const dotClass = isStale ? "text-regime-off" : "text-regime-on";
  // 자동 갱신 스케줄러가 없는 lazy 캐시(요청 시 갱신, 최대 30분 수명)다 — '주기 갱신' 같은
  // 자동 갱신 암시나 '실시간' 초단위 신선함 암시를 피한다(철학5 과신방지).
  const asOf = isStale && generatedAt ? formatAsOf(generatedAt) : "";
  const label = isStale
    ? asOf
      ? `갱신 지연 — ${asOf} 기준, 최신이 아닐 수 있어요`
      : "갱신 지연 — 최신이 아닐 수 있어요"
    : "시장 데이터 · 최대 30분 캐시";

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground">
      <span className={`h-1.5 w-1.5 rounded-full bg-current ${dotClass}`} aria-hidden />
      {label}
    </span>
  );
}
