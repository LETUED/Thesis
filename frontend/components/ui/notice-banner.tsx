import * as React from "react";
import {
  Info,
  AlertTriangle,
  ShieldAlert,
  CloudOff,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

type Tone = "info" | "caution" | "warn" | "shield" | "success";

// 톤별 기본 아이콘. 색 단독 의존 금지를 위해 항상 아이콘을 동반한다.
const TONE_ICONS: Record<Tone, LucideIcon> = {
  info: Info,
  caution: AlertTriangle,
  warn: CloudOff,
  shield: ShieldAlert,
  success: CheckCircle2,
};

export interface NoticeBannerProps
  extends React.HTMLAttributes<HTMLDivElement> {
  tone?: Tone;
  icon?: LucideIcon;
}

export const NoticeBanner = React.forwardRef<
  HTMLDivElement,
  NoticeBannerProps
>(
  (
    { tone = "info", icon, role = "note", className, children, ...props },
    ref,
  ) => {
    const Icon = icon ?? TONE_ICONS[tone];
    return (
      <div
        ref={ref}
        role={role}
        className={cn(
          "flex items-start gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm leading-relaxed text-muted-foreground",
          className,
        )}
        {...props}
      >
        <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
        <div className="min-w-0">{children}</div>
      </div>
    );
  },
);
NoticeBanner.displayName = "NoticeBanner";
