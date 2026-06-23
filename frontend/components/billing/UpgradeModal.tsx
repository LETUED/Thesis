"use client";

import * as React from "react";
import { X } from "lucide-react";
import { ModalShell } from "@/components/ui/modal-shell";
import { PlanComparison } from "@/components/billing/PlanComparison";
import { UpgradeButton } from "@/components/billing/UpgradeButton";
import { UPSELL_COPY, UPSELL_DISCLAIMER, type UpsellSource } from "@/lib/upsell";
import { track } from "@/lib/analytics";

// 인컨텍스트 업셀 모달. ModalShell 재사용으로 focus-trap·Esc·aria 내장.
// 잠금 지점(source)별 카피 + 3티어 비교(compact, Quant 앵커) + Pro 결제 CTA.
// 과신 방지 고지를 항상 동반해 결제 유도가 면책을 가리지 않게 한다.
export interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  source: UpsellSource;
}

export function UpgradeModal({ open, onClose, source }: UpgradeModalProps) {
  const copy = UPSELL_COPY[source];
  const headingId = React.useId();

  React.useEffect(() => {
    if (open) track("upsell_modal_view", { source });
  }, [open, source]);

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      labelledBy={headingId}
      className="max-w-2xl"
    >
      <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
        <div className="min-w-0">
          <h2 id={headingId} className="text-base font-semibold">
            {copy.title}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{copy.body}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="-mr-2 -mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
        <PlanComparison compact />

        <div className="mt-5 flex justify-center">
          <UpgradeButton
            label="Pro로 업그레이드"
            variant="default"
            size="default"
            onClick={() => track("upsell_modal_click", { source })}
          />
        </div>

        <p className="mt-5 text-xs leading-relaxed text-muted-foreground" role="note">
          {UPSELL_DISCLAIMER}
        </p>
      </div>
    </ModalShell>
  );
}
