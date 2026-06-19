import { Lock } from "lucide-react";
import { UpgradeButton } from "@/components/billing/UpgradeButton";
import type { EvidenceLocked as EvidenceLockedData } from "@/lib/types";

// free 플랜에서 evidence 자리에 노출되는 Pro 업그레이드 CTA.
// '근거가 더 있습니다' 톤 — 단정/매수 권유 문구 금지.
export function EvidenceLocked({ data }: { data: EvidenceLockedData }) {
  return (
    <div className="rounded-md border border-dashed border-border bg-muted/40 p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Lock className="h-4 w-4" aria-hidden />
        </span>
        <div className="flex-1">
          <p className="text-sm font-medium">상세 근거는 Pro에서</p>
          <p className="mt-1 text-sm text-muted-foreground">{data.preview}</p>
          <div className="mt-3">
            <UpgradeButton label="Pro로 자세히 보기" variant="locked" size="sm" />
          </div>
        </div>
      </div>
    </div>
  );
}
