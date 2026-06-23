"use client";

import * as React from "react";
import { Bell, BellRing, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import {
  listAlertRules,
  removeAlertRule,
  setAlertEnabled,
  type AlertRule,
} from "@/lib/personalization/alerts";
import { Panel } from "@/components/ui/panel";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";

// 설정 페이지 "알림" 관리 island — 목록·끄기/켜기·삭제만(규칙 추가는 지표 카드의 AlertRuleControl).
// listAlertRules 로 패치(fail-open), setAlertEnabled/removeAlertRule 로 관리한다.
// 비면 교육형 EmptyState 로 "관심 지표에서 임계 알림을 걸 수 있어요" 안내.
// 알림은 임계값이 경계 구간에 들어선 순간을 통지할 뿐 — 매수·매도 시점을 알리지 않는다.
// 테이블 미적용/미인증이면 목록은 비고 UI 는 안 깨진다.

// threshold_kind → 사람이 읽는 라벨. 미지정 종류는 원문 노출.
const THRESHOLD_KIND_LABEL: Record<string, string> = {
  breach: "경계·위험 돌파",
};

function thresholdKindLabel(kind: string): string {
  return THRESHOLD_KIND_LABEL[kind] ?? kind;
}

export function AlertRulesSection() {
  const [rules, setRules] = React.useState<AlertRule[]>([]);
  const [loaded, setLoaded] = React.useState(false);
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    void listAlertRules().then((next) => {
      if (!active) return;
      setRules(next);
      setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, []);

  async function handleToggle(rule: AlertRule) {
    if (pendingId) return;
    const next = !rule.enabled;
    // 낙관적 갱신 후 실패하면 롤백.
    setRules((prev) =>
      prev.map((r) => (r.id === rule.id ? { ...r, enabled: next } : r)),
    );
    setPendingId(rule.id);
    const ok = await setAlertEnabled(rule.id, next);
    setPendingId(null);
    if (!ok) {
      setRules((prev) =>
        prev.map((r) => (r.id === rule.id ? { ...r, enabled: rule.enabled } : r)),
      );
    }
  }

  async function handleDelete(id: string) {
    if (pendingId) return;
    setPendingId(id);
    const ok = await removeAlertRule(id);
    setPendingId(null);
    if (ok) setRules((prev) => prev.filter((r) => r.id !== id));
  }

  if (rules.length > 0) {
    return (
      <ul className="space-y-2">
        {rules.map((rule) => {
          const Icon = rule.enabled ? BellRing : Bell;
          const isPending = pendingId === rule.id;
          return (
            <li key={rule.id}>
              <Panel className="flex items-center justify-between gap-3 py-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <Icon
                    aria-hidden
                    className={cn(
                      "h-4 w-4 shrink-0 text-muted-foreground",
                      rule.enabled && "fill-current text-foreground",
                    )}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {rule.symbol}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                      <Chip variant="muted">
                        {thresholdKindLabel(rule.threshold_kind)}
                      </Chip>
                      <span className="text-xs text-muted-foreground">
                        {rule.enabled ? "켜짐" : "꺼짐"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => void handleToggle(rule)}
                    disabled={isPending}
                    aria-pressed={rule.enabled}
                    title={
                      rule.enabled
                        ? `${rule.symbol} 알림 끄기`
                        : `${rule.symbol} 알림 켜기`
                    }
                    className={cn(
                      "inline-flex items-center rounded-md border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors",
                      "hover:bg-muted hover:text-foreground",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20",
                      "disabled:cursor-not-allowed disabled:opacity-60",
                      rule.enabled && "text-foreground",
                    )}
                  >
                    {rule.enabled ? "끄기" : "켜기"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(rule.id)}
                    disabled={isPending}
                    aria-label={`${rule.symbol} 알림 삭제`}
                    title={`${rule.symbol} 알림 삭제`}
                    className={cn(
                      "inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors",
                      "hover:bg-muted hover:text-foreground",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20",
                      "disabled:cursor-not-allowed disabled:opacity-60",
                    )}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </Panel>
            </li>
          );
        })}
      </ul>
    );
  }

  if (!loaded) {
    return (
      <p className="text-sm text-muted-foreground">알림을 불러오는 중...</p>
    );
  }

  return (
    <EmptyState
      variant="teaching"
      icon={<Bell className="h-5 w-5" aria-hidden />}
      title="설정한 알림이 없어요"
      description="관심 지표 카드에서 임계 알림을 걸 수 있어요. 임계값이 경계 구간에 들어선 순간만 알려줄 뿐, 매수·매도 시점을 알리지는 않습니다."
    />
  );
}
