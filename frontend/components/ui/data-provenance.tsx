import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { Chip } from "@/components/ui/chip";
import { formatAsOf } from "@/lib/utils/datetime";

// 신뢰 푸터 — 결론 아래에 "언제 기준 데이터인지 + 어디서 왔는지"를 한 줄로 보여준다.
// 과신방지와 균형: 믿을 근거(신선도·출처)는 차분히 제시하되 단정하지 않는다. 수치 비노출(Free 안전).
// generatedAt·source 가 모두 없으면(또는 잘못된 시각이면) 아무것도 렌더하지 않는다.
export interface DataProvenanceProps {
  generatedAt?: string | null;
  source?: string | null;
  className?: string;
}

export function DataProvenance({
  generatedAt,
  source,
  className,
}: DataProvenanceProps) {
  const asOf = formatAsOf(generatedAt);
  if (!asOf && !source) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground",
        className,
      )}
    >
      {asOf ? <span>기준 {asOf}</span> : null}
      {source ? (
        <span className="inline-flex items-center gap-1.5">
          출처
          <Chip variant="outline">{source}</Chip>
        </span>
      ) : null}
    </div>
  );
}
