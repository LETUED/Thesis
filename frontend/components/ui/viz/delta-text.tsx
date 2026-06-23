import * as React from "react";
import { cn } from "@/lib/utils/cn";
import type { Tier, ThresholdHit } from "@/lib/types";
import { formatDelta, THRESHOLD_STYLES } from "@/lib/viz/scale";

type Direction = "up" | "down" | "flat";

// 방향 정성 표현 — panic red 회피. 색은 절제하고 방향 글리프/텍스트로 의미 전달.
const DIRECTION_GLYPH: Record<Direction, string> = {
  up: "▲",
  down: "▼",
  flat: "—",
};

const DIRECTION_LABEL: Record<Direction, string> = {
  up: "상승",
  down: "하락",
  flat: "보합",
};

function directionFromValue(n: number): Direction {
  if (n > 0) return "up";
  if (n < 0) return "down";
  return "flat";
}

export interface DeltaTextProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, "dir"> {
  value?: number | null;
  tier: Tier;
  status?: ThresholdHit | null;
  dir?: Direction;
}

export const DeltaText = React.forwardRef<HTMLSpanElement, DeltaTextProps>(
  ({ className, value, tier, status, dir, ...props }, ref) => {
    // 방향: 명시 dir 우선, 없으면 value 부호로 도출.
    const direction: Direction =
      dir ?? (value != null && !Number.isNaN(value)
        ? directionFromValue(value)
        : "flat");

    // 색은 상태(status)가 주어질 때만 절제 사용. panic red 회피 위해 status 없으면 muted.
    const colorVar = status ? THRESHOLD_STYLES[status].colorVar : undefined;

    if (tier === "free") {
      // Free=정성: 방향/상태 텍스트만(수치 비노출).
      const statusText = status ? THRESHOLD_STYLES[status].label : null;
      const dirText = DIRECTION_LABEL[direction];
      const visible = statusText ? `${dirText} · ${statusText}` : dirText;
      return (
        <span
          ref={ref}
          className={cn(
            "inline-flex items-center gap-1 text-sm font-medium",
            !colorVar && "text-muted-foreground",
            className,
          )}
          style={colorVar ? { color: colorVar } : undefined}
          {...props}
        >
          <span aria-hidden="true">{DIRECTION_GLYPH[direction]}</span>
          <span>{visible}</span>
        </span>
      );
    }

    // Pro=정량: 부호 포함 수치.
    const formatted = formatDelta(value, { suffix: "%" });
    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center gap-1 text-sm font-medium tabular-nums",
          !colorVar && "text-muted-foreground",
          className,
        )}
        style={colorVar ? { color: colorVar } : undefined}
        {...props}
      >
        <span aria-hidden="true">{DIRECTION_GLYPH[direction]}</span>
        <span>{formatted}</span>
        <span className="sr-only">{`방향 ${DIRECTION_LABEL[direction]}`}</span>
      </span>
    );
  },
);
DeltaText.displayName = "DeltaText";
