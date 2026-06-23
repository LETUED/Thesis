import { LockedCard } from "@/components/paywall/LockedCard";
import type { EvidenceLocked as EvidenceLockedData } from "@/lib/types";

// free 플랜에서 evidence 자리에 노출되는 Pro 업그레이드 placeholder.
// 공개 API {data} 보존(RegimeSignalCard·AllocationPanel 소비). 내부는 LockedCard 로 위임.
// '상세 근거는 Pro' 톤 유지 — 단정/매수 권유 문구 금지, raw 값 비노출(preview/summary 만).
export function EvidenceLocked({ data }: { data: EvidenceLockedData }) {
  const summary = [
    data.preview,
    ...(data.locked_summary ?? []),
  ].filter((line): line is string => Boolean(line));

  return <LockedCard mode="card" source="evidence_regime" summary={summary} />;
}
