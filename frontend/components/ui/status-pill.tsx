import * as React from "react";
import { cn } from "@/lib/utils/cn";
import type { ThresholdHit } from "@/lib/types";
import { THRESHOLD_STYLES } from "@/lib/viz/scale";

type Size = "default" | "sm";

const SIZE_CLASSES: Record<Size, string> = {
  default: "h-7 px-2.5 text-xs gap-1.5",
  sm: "h-6 px-2 text-[11px] gap-1",
};

const DOT_SIZE_CLASSES: Record<Size, string> = {
  default: "h-1.5 w-1.5",
  sm: "h-1 w-1",
};

export interface StatusPillProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, "color"> {
  status: ThresholdHit;
  label?: string;
  size?: Size;
}

// 수치 절대 노출 금지: 색 + 텍스트 라벨 + 점을 항상 병기한다(색 단독 금지).
// 색은 scale.ts → globals.css 의 --status-* 변수에 위임.
export const StatusPill = React.forwardRef<HTMLSpanElement, StatusPillProps>(
  ({ className, status, label, size = "default", ...props }, ref) => {
    const style = THRESHOLD_STYLES[status];
    const text = label ?? style.label;

    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center rounded-md border border-border bg-surface-1 font-medium text-foreground",
          SIZE_CLASSES[size],
          className,
        )}
        {...props}
      >
        <span
          aria-hidden="true"
          className={cn("shrink-0 rounded-full", DOT_SIZE_CLASSES[size])}
          style={{ backgroundColor: style.dotVar }}
        />
        <span style={{ color: style.colorVar }}>{text}</span>
        <span className="sr-only">{`상태: ${text}`}</span>
      </span>
    );
  },
);
StatusPill.displayName = "StatusPill";
