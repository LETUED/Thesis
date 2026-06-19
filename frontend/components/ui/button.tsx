import * as React from "react";
import { cn } from "@/lib/utils/cn";

type Variant = "default" | "outline" | "ghost" | "locked";
type Size = "default" | "sm" | "lg";

const VARIANT_CLASSES: Record<Variant, string> = {
  default:
    "bg-foreground text-background hover:bg-foreground/90",
  outline:
    "border border-border bg-background hover:bg-muted",
  ghost: "hover:bg-muted",
  locked:
    "border border-border bg-muted/60 text-muted-foreground hover:bg-muted",
};

const SIZE_CLASSES: Record<Size, string> = {
  default: "h-10 px-4 py-2 text-sm",
  sm: "h-8 px-3 text-xs",
  lg: "h-11 px-6 text-base",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20 disabled:pointer-events-none disabled:opacity-50",
          VARIANT_CLASSES[variant],
          SIZE_CLASSES[size],
          className,
        )}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
