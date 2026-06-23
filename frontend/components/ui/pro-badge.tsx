import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface ProBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  label?: string;
}

export const ProBadge = React.forwardRef<HTMLSpanElement, ProBadgeProps>(
  ({ className, label = "Pro", ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground",
          className,
        )}
        {...props}
      >
        {label}
      </span>
    );
  },
);
ProBadge.displayName = "ProBadge";
