import * as React from "react";
import { cn } from "@/lib/utils/cn";

type Tone = "default" | "muted" | "emphasis";

const TONE_CLASSES: Record<Tone, string> = {
  default: "border border-border bg-card text-card-foreground",
  muted: "border border-border bg-muted text-foreground",
  emphasis: "border border-transparent bg-foreground text-on-emphasis",
};

export interface PanelProps extends React.HTMLAttributes<HTMLElement> {
  tone?: Tone;
  as?: React.ElementType;
}

export const Panel = React.forwardRef<HTMLElement, PanelProps>(
  ({ className, tone = "default", as, ...props }, ref) => {
    const Comp = as ?? "div";
    return (
      <Comp
        ref={ref}
        className={cn("rounded-xl p-5", TONE_CLASSES[tone], className)}
        {...props}
      />
    );
  },
);
Panel.displayName = "Panel";
