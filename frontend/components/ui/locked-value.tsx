import * as React from "react";
import { cn } from "@/lib/utils/cn";

type Direction = "up" | "down" | null;

export interface LockedValueProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, "dir"> {
  label?: string;
  dir?: Direction;
}

const DIRECTION_GLYPH: Record<NonNullable<Direction>, string> = {
  up: "↑",
  down: "↓",
};

const DIRECTION_LABEL: Record<NonNullable<Direction>, string> = {
  up: "상승",
  down: "하락",
};

export const LockedValue = React.forwardRef<HTMLSpanElement, LockedValueProps>(
  ({ className, label, dir = null, ...props }, ref) => {
    const ariaLabel = label ? `${label} Pro 잠금` : "Pro 잠금";

    return (
      <span
        ref={ref}
        role="img"
        aria-label={ariaLabel}
        className={cn(
          "inline-flex select-none items-center gap-1 rounded-md border border-border bg-muted px-2 py-0.5 text-sm text-muted-foreground",
          className,
        )}
        {...props}
      >
        <span aria-hidden="true" className="font-medium tracking-widest">
          •••
        </span>
        {dir ? (
          <span aria-hidden="true" className="text-xs">
            {DIRECTION_GLYPH[dir]}
          </span>
        ) : null}
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-3 w-3"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <span className="sr-only">
          {dir ? `방향 ${DIRECTION_LABEL[dir]}, ` : ""}Pro 플랜 잠금
        </span>
      </span>
    );
  },
);
LockedValue.displayName = "LockedValue";
