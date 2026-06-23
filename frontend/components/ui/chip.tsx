import * as React from "react";
import { cn } from "@/lib/utils/cn";

type Variant = "default" | "muted" | "outline";

const VARIANT_CLASSES: Record<Variant, string> = {
  default: "bg-surface-1 text-foreground border border-border",
  muted: "bg-muted text-muted-foreground",
  outline: "border border-border text-foreground",
};

export interface ChipProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
}

export const Chip = React.forwardRef<HTMLSpanElement, ChipProps>(
  ({ className, variant = "default", ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
          VARIANT_CLASSES[variant],
          className,
        )}
        {...props}
      />
    );
  },
);
Chip.displayName = "Chip";
