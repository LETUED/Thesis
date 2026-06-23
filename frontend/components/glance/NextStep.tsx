import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";

export interface NextStepProps extends React.HTMLAttributes<HTMLElement> {
  // 이전 단계(매크로←배분←기업). 둘 다 있을 때만 노출.
  prevHref?: string;
  prevLabel?: string;
  // 다음 단계(매크로→배분→기업). 둘 다 있을 때만 노출.
  nextHref?: string;
  nextLabel?: string;
  // 다음으로 넘어가는 한 줄 이유(Top-Down 흐름의 연결고리).
  reason?: string;
}

export const NextStep = React.forwardRef<HTMLElement, NextStepProps>(
  ({ className, prevHref, prevLabel, nextHref, nextLabel, reason, ...props }, ref) => {
    const hasPrev = Boolean(prevHref && prevLabel);
    const hasNext = Boolean(nextHref && nextLabel);

    if (!hasPrev && !hasNext) return null;

    return (
      <nav
        ref={ref}
        aria-label="다음 단계"
        className={cn(
          "flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between",
          className,
        )}
        {...props}
      >
        <div className="order-2 sm:order-1">
          {hasPrev ? (
            <Link
              href={prevHref as string}
              className="inline-flex items-center gap-1 rounded-md text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:text-foreground focus-visible:underline focus-visible:outline-none"
            >
              <span aria-hidden="true">←</span>
              {prevLabel}
            </Link>
          ) : null}
        </div>

        <div className="order-1 flex flex-col items-start gap-1 sm:order-2 sm:items-end">
          {reason ? (
            <p className="text-xs text-muted-foreground">{reason}</p>
          ) : null}
          {hasNext ? (
            <Link
              href={nextHref as string}
              className="inline-flex items-center gap-1.5 rounded-md text-sm font-semibold text-foreground underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none"
            >
              {nextLabel}
              <span aria-hidden="true">→</span>
            </Link>
          ) : null}
        </div>
      </nav>
    );
  },
);
NextStep.displayName = "NextStep";
