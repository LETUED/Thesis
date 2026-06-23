import * as React from "react";
import { cn } from "@/lib/utils/cn";
import type { ThresholdHit, Tier } from "@/lib/types";
import { thresholdStyle } from "@/lib/viz/scale";
import { StatusPill } from "@/components/ui/status-pill";
import { LockedValue } from "@/components/ui/locked-value";

export interface BulletRowProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "color"> {
  label: string;
  value?: number | null;
  target?: number;
  threshold?: number;
  tier: Tier;
  status?: ThresholdHit | null;
}

// 도메인 0 기준 clamp 비율(%) — 음수/과대값 방어.
function pct(n: number, max: number): number {
  if (max <= 0 || !Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, (n / max) * 100));
}

// 목표·임계 대비 현재(Stephen Few bullet). 색은 절제: 막대는 중립(--track-fill),
// 위험도는 status 가 있을 때만 텍스트 라벨(StatusPill)로 병기. 색 단독 금지.
export function BulletRow({
  className,
  label,
  value,
  target,
  threshold,
  tier,
  status,
  ...props
}: BulletRowProps) {
  const hasRaw = tier === "pro" && value != null;
  const style = thresholdStyle(status);

  return (
    <div
      className={cn("flex flex-col gap-1.5", className)}
      {...props}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm text-foreground">{label}</span>
        {status ? (
          <StatusPill status={status} size="sm" />
        ) : !hasRaw ? (
          <LockedValue label={label} />
        ) : null}
      </div>

      {hasRaw ? (
        <ProBullet value={value} target={target} threshold={threshold} />
      ) : (
        // Free(raw 없음): 정성 표시만. status 가 없으면 줄(track) 자체를 흐릿한 도식으로.
        <div
          role="img"
          aria-label={
            style
              ? `${label}: 현재 상태 ${style.label}`
              : `${label}: 상세 수치는 Pro에서 제공`
          }
          className="h-2 w-full rounded-full bg-track opacity-60"
        />
      )}
    </div>
  );
}

function ProBullet({
  value,
  target,
  threshold,
}: {
  value: number;
  target?: number;
  threshold?: number;
}) {
  // 스케일 상한: value/target/threshold 중 최대를 기준(여유 10%)으로 잡는다.
  const candidates = [value, target ?? 0, threshold ?? 0].filter((n) =>
    Number.isFinite(n),
  );
  const max = Math.max(...candidates, 1) * 1.1;

  const valuePct = pct(value, max);
  const targetPct = target != null ? pct(target, max) : null;
  const thresholdPct = threshold != null ? pct(threshold, max) : null;

  const ariaParts = [`현재 ${value}`];
  if (target != null) ariaParts.push(`목표 ${target}`);
  if (threshold != null) ariaParts.push(`임계 ${threshold}`);

  return (
    <div
      role="img"
      aria-label={ariaParts.join(", ")}
      className="relative h-2.5 w-full rounded-full bg-track"
    >
      {/* 현재값 막대 */}
      <div
        className="absolute inset-y-0 left-0 rounded-full bg-track-fill"
        style={{ width: `${valuePct}%` }}
        aria-hidden="true"
      />
      {/* 목표 눈금(세로 틱) */}
      {targetPct != null ? (
        <span
          className="absolute top-1/2 h-3 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground"
          style={{ left: `${targetPct}%` }}
          aria-hidden="true"
        />
      ) : null}
      {/* 임계 마커(점선 톤 틱) */}
      {thresholdPct != null ? (
        <span
          className="absolute top-1/2 h-3.5 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-muted-foreground"
          style={{ left: `${thresholdPct}%` }}
          aria-hidden="true"
        />
      ) : null}
    </div>
  );
}
