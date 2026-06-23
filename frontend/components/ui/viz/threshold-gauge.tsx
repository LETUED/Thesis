import * as React from "react";
import { cn } from "@/lib/utils/cn";
import type { ThresholdHit } from "@/lib/types";
import { THRESHOLD_STYLES } from "@/lib/viz/scale";

// 4밴드(안정→중립→주의→경계) 트랙. 마커는 해당 밴드 '중앙'에 스냅한다.
// 원시 수치를 역산할 단서를 주지 않기 위해 위치는 밴드 중앙 고정(연속 위치 금지).
const BAND_ORDER: ThresholdHit[] = ["calm", "neutral", "warn", "danger"];

// 밴드 중앙 위치(%) — 4등분 트랙의 각 칸 중앙.
const MARKER_CENTER_PCT: Record<ThresholdHit, number> = {
  calm: 12.5,
  neutral: 37.5,
  warn: 62.5,
  danger: 87.5,
};

export interface ThresholdGaugeProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "color"> {
  status: ThresholdHit;
  label?: string;
}

export const ThresholdGauge = React.forwardRef<
  HTMLDivElement,
  ThresholdGaugeProps
>(({ className, status, label, ...props }, ref) => {
  const style = THRESHOLD_STYLES[status];
  const statusText = style.label;
  const ariaLabel = label ? `${label}: ${statusText}` : `상태: ${statusText}`;
  const left = MARKER_CENTER_PCT[status];

  return (
    <div
      ref={ref}
      role="img"
      aria-label={ariaLabel}
      className={cn("flex flex-col gap-1.5", className)}
      {...props}
    >
      <div className="relative h-2 w-full">
        {/* 4밴드 트랙 — 색만으로 단계를 추정하지 못하도록 모두 --track 배경, 칸 구분선만 노출 */}
        <div
          aria-hidden="true"
          className="flex h-full w-full overflow-hidden rounded-full"
          style={{ backgroundColor: "hsl(var(--track))" }}
        >
          {BAND_ORDER.map((band, i) => (
            <div
              key={band}
              className={cn(
                "h-full flex-1",
                i > 0 && "border-l border-background",
              )}
            />
          ))}
        </div>
        {/* 현재 상태 마커 — 밴드 중앙에 스냅(숫자 없이 위치만) */}
        <span
          aria-hidden="true"
          className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background shadow-sm"
          style={{ left: `${left}%`, backgroundColor: style.dotVar }}
        />
      </div>
      <span style={{ color: style.colorVar }} className="text-xs font-medium">
        {label ? `${label} · ${statusText}` : statusText}
      </span>
    </div>
  );
});
ThresholdGauge.displayName = "ThresholdGauge";
