import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { Panel } from "@/components/ui/panel";

type Variant = "teaching" | "soon";

const VARIANT_LABEL: Record<Variant, string> = {
  teaching: "시작 안내",
  soon: "곧 제공",
};

export interface EmptyStateProps
  extends React.HTMLAttributes<HTMLDivElement> {
  variant: Variant;
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  (
    { className, variant, icon, title, description, action, ...props },
    ref,
  ) => {
    return (
      <Panel
        ref={ref as React.Ref<HTMLElement>}
        tone={variant === "teaching" ? "default" : "muted"}
        className={cn(
          "flex flex-col items-center gap-3 py-10 text-center",
          className,
        )}
        {...props}
      >
        {icon ? (
          <div
            aria-hidden="true"
            className="flex h-11 w-11 items-center justify-center rounded-lg bg-muted text-muted-foreground"
          >
            {icon}
          </div>
        ) : null}
        <span className="sr-only">{VARIANT_LABEL[variant]}</span>
        <div className="flex flex-col gap-1.5">
          <h3 className="text-base font-semibold leading-none tracking-tight text-foreground">
            {title}
          </h3>
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">
            {description}
          </p>
        </div>
        {action ? <div className="mt-1">{action}</div> : null}
      </Panel>
    );
  },
);
EmptyState.displayName = "EmptyState";
