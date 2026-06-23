"use client";

import * as React from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Panel } from "@/components/ui/panel";
import { Chip } from "@/components/ui/chip";
import type { SavedRule } from "@/lib/personalization/companyId";

// 저장된 자산배분 규칙 1건 카드. 이름 + 성향/기간/국면반영 칩 + 삭제 + (선택) 적용 동선.
// 과신 방지 톤 — 저장된 '설정'을 다시 불러오는 것일 뿐 매수·매도 판단을 대신하지 않는다.
// 적용은 onApply 콜백 또는 applyHref Link 중 하나만 노출(둘 다 주면 콜백 우선).

const RISK_LABEL: Record<string, string> = {
  very_conservative: "안정 최우선",
  conservative: "신중",
  moderate: "균형",
  aggressive: "적극",
  very_aggressive: "공격적",
};

const HORIZON_LABEL: Record<string, string> = {
  short: "단기",
  mid: "중기",
  medium: "중기",
  long: "장기",
};

export interface SavedRuleCardProps {
  rule: SavedRule;
  onApply?: (rule: SavedRule) => void;
  applyHref?: string;
  onDelete?: (id: string) => void;
  className?: string;
}

export function SavedRuleCard({
  rule,
  onApply,
  applyHref,
  onDelete,
  className,
}: SavedRuleCardProps) {
  const risk = rule.risk_tolerance
    ? RISK_LABEL[rule.risk_tolerance] ?? rule.risk_tolerance
    : null;
  const horizon = rule.horizon
    ? HORIZON_LABEL[rule.horizon] ?? rule.horizon
    : null;

  return (
    <Panel className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 break-words text-sm font-semibold text-foreground">
          {rule.name}
        </h3>
        {onDelete ? (
          <button
            type="button"
            onClick={() => onDelete(rule.id)}
            aria-label={`${rule.name} 규칙 삭제`}
            title={`${rule.name} 규칙 삭제`}
            className="-mr-1 -mt-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </button>
        ) : null}
      </div>

      {risk || horizon || rule.reflect_current_regime ? (
        <div className="flex flex-wrap gap-1.5">
          {risk ? <Chip variant="muted">{risk}</Chip> : null}
          {horizon ? <Chip variant="muted">{horizon}</Chip> : null}
          {rule.reflect_current_regime ? (
            <Chip variant="outline">현재 국면 반영</Chip>
          ) : null}
        </div>
      ) : null}

      <p className="text-xs leading-relaxed text-muted-foreground">
        저장해 둔 배분 설정입니다. 불러와 참고용으로 다시 살펴볼 수 있어요 — 매수·매도
        판단을 대신하지는 않습니다.
      </p>

      {onApply ? (
        <button
          type="button"
          onClick={() => onApply(rule)}
          className="inline-flex w-fit items-center rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
        >
          이 설정 불러오기
        </button>
      ) : applyHref ? (
        <Link
          href={applyHref}
          className="inline-flex w-fit items-center rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
        >
          이 설정 불러오기
        </Link>
      ) : null}
    </Panel>
  );
}
