"use client";

import * as React from "react";
import { Bell, BellRing } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { Tier } from "@/lib/types";
import {
  addAlertRule,
  listAlertRules,
  removeAlertRule,
} from "@/lib/personalization/alerts";
import { UpgradeModal } from "@/components/billing/UpgradeModal";

// 한 지표의 임계 돌파 알림 토글(컴팩트, 카드 슬롯용). 마운트 시 활성 여부를 조회하고
// 클릭으로 add/remove 한다. 낙관적 갱신 후 실패하면 직전 상태로 롤백한다.
// Free 가 이미 다른 지표로 1개를 걸어둔 상태면 토글 대신 업셀(source="alert_limit")을 띄운다.
// 알림은 "임계값이 경계 구간에 들어선 순간"을 통지할 뿐 — 매수·매도 시점을 알리지 않는다.
// 색만으로 상태를 표현하지 않도록 aria-pressed + sr-only 라벨 + 채움(BellRing)/외곽선(Bell)
// 아이콘을 함께 쓴다. 게임화(점수·스트릭·푸시몰이) 톤 금지.

// 임계 종류 — 같은 지표라도 어떤 임계를 감시하는지 구분. 기본은 경계/위험 돌파.
const DEFAULT_THRESHOLD_KIND = "breach";

export interface AlertRuleControlProps {
  symbol: string;
  displayName: string;
  tier: Tier;
  thresholdKind?: string;
  className?: string;
}

export function AlertRuleControl({
  symbol,
  displayName,
  tier,
  thresholdKind = DEFAULT_THRESHOLD_KIND,
  className,
}: AlertRuleControlProps) {
  const [enabled, setEnabled] = React.useState(false);
  const [ruleId, setRuleId] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const [upsellOpen, setUpsellOpen] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    void listAlertRules().then((rules) => {
      if (!active) return;
      const match = rules.find(
        (r) => r.symbol === symbol && r.threshold_kind === thresholdKind,
      );
      setEnabled(Boolean(match?.enabled));
      setRuleId(match?.id ?? null);
    });
    return () => {
      active = false;
    };
  }, [symbol, thresholdKind]);

  async function handleToggle() {
    if (pending) return;

    if (enabled && ruleId) {
      setEnabled(false);
      setPending(true);
      const ok = await removeAlertRule(ruleId);
      setPending(false);
      if (ok) {
        setRuleId(null);
      } else {
        setEnabled(true); // 롤백
      }
      return;
    }

    setEnabled(true);
    setPending(true);
    const result = await addAlertRule(
      { symbol, threshold_kind: thresholdKind },
      tier,
    );
    setPending(false);
    if (!result.ok) {
      setEnabled(false); // 롤백
      if (result.reason === "limit") setUpsellOpen(true);
    }
  }

  const actionLabel = enabled
    ? `${displayName} 임계 알림 끄기`
    : `${displayName} 임계 알림 켜기`;
  const Icon = enabled ? BellRing : Bell;

  return (
    <>
      <button
        type="button"
        onClick={handleToggle}
        disabled={pending}
        aria-pressed={enabled}
        title={actionLabel}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs font-medium text-muted-foreground transition-colors",
          "hover:bg-muted hover:text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20",
          "disabled:cursor-not-allowed disabled:opacity-60",
          enabled && "text-foreground",
          className,
        )}
      >
        <Icon
          aria-hidden
          className={cn("h-4 w-4 shrink-0", enabled && "fill-current")}
        />
        <span aria-hidden>{enabled ? "알림 켜짐" : "임계 알림"}</span>
        <span className="sr-only">{actionLabel}</span>
      </button>

      {tier === "free" ? (
        <UpgradeModal
          open={upsellOpen}
          onClose={() => setUpsellOpen(false)}
          source="alert_limit"
        />
      ) : null}
    </>
  );
}
