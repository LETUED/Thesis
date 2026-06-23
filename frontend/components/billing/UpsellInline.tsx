"use client";

import * as React from "react";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { UPSELL_COPY, type UpsellSource } from "@/lib/upsell";
import { track } from "@/lib/analytics";
import { UpgradeButton } from "@/components/billing/UpgradeButton";

// 잠금 지점 옆에 붙는 한 줄 인라인 업셀. "근거가 더 있습니다 → Pro" 류.
// 마운트 시 노출, CTA 클릭 시 클릭을 추적한다. 과신 방지 톤(카피는 UPSELL_COPY 단일출처).
export interface UpsellInlineProps {
  source: UpsellSource;
  className?: string;
}

export function UpsellInline({ source, className }: UpsellInlineProps) {
  const copy = UPSELL_COPY[source];

  React.useEffect(() => {
    track("upsell_view", { source });
  }, [source]);

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm leading-relaxed text-muted-foreground sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="flex items-start gap-3 sm:items-center">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 sm:mt-0" aria-hidden />
        <div className="min-w-0">
          <span className="font-medium text-foreground">{copy.title}</span>
          <span className="ml-2">{copy.body}</span>
        </div>
      </div>
      <UpgradeButton
        label="Pro에서 보기"
        variant="outline"
        size="sm"
        className="shrink-0"
        onClick={() => track("upsell_click", { source })}
      />
    </div>
  );
}
