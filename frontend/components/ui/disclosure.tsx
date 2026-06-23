import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface DisclosureProps
  extends Omit<React.HTMLAttributes<HTMLDetailsElement>, "title"> {
  summary: React.ReactNode;
  defaultOpen?: boolean;
}

// 네이티브 <details>/<summary> 기반 접근성 펼침. 클릭/포커스로 동작(hover 전용 금지).
// 아이콘은 펼침 상태에 따라 회전하는 어포던스만 제공.
export const Disclosure = React.forwardRef<HTMLDetailsElement, DisclosureProps>(
  ({ className, summary, children, defaultOpen = false, ...props }, ref) => {
    return (
      <details
        ref={ref}
        open={defaultOpen}
        className={cn("group rounded-md border border-border", className)}
        {...props}
      >
        <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
          <span>{summary}</span>
        </summary>
        <div className="border-t border-border px-3 py-2 text-sm text-foreground">
          {children}
        </div>
      </details>
    );
  },
);
Disclosure.displayName = "Disclosure";
