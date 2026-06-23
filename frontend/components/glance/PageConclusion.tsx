import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";

// 라벨 배지 색상 슬롯. lib/regime.ts 의 REGIME_STYLES 한 항목을 그대로 넘길 수 있다.
// (badgeBg/badgeText/dot 은 globals.css 의 CSS 변수를 참조하는 hsl 문자열)
export interface ConclusionLabelStyle {
  badgeBg: string;
  badgeText: string;
  dot: string;
}

export interface ConclusionLabel {
  text: string;
  style?: ConclusionLabelStyle;
}

export interface PageConclusionProps
  extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  // 탭 이름(작게, 위). 결론 헤드라인의 컨텍스트.
  title: string;
  // 한 줄 평결(크게). conclusion-first — 탭 진입 시 결론을 먼저 보여준다.
  headline?: string;
  // 국면/리스크 라벨 배지(색 + 텍스트 병기, 색 단독 금지).
  label?: ConclusionLabel;
  // FreshnessChip 등 신선도 표시 슬롯.
  freshness?: React.ReactNode;
  // 다음 행동(Top-Down 흐름의 다음 단계). 둘 다 있을 때만 노출.
  nextHref?: string;
  nextLabel?: string;
}

export const PageConclusion = React.forwardRef<
  HTMLElement,
  PageConclusionProps
>(
  (
    {
      className,
      title,
      headline,
      label,
      freshness,
      nextHref,
      nextLabel,
      ...props
    },
    ref,
  ) => {
    const hasNext = Boolean(nextHref && nextLabel);

    return (
      <header
        ref={ref}
        className={cn(
          "flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4",
          className,
        )}
        {...props}
      >
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {title}
            </p>
            {label ? (
              <span
                className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold"
                style={
                  label.style
                    ? {
                        backgroundColor: label.style.badgeBg,
                        color: label.style.badgeText,
                      }
                    : undefined
                }
              >
                {label.style ? (
                  <span
                    aria-hidden="true"
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: label.style.dot }}
                  />
                ) : null}
                {label.text}
              </span>
            ) : null}
          </div>
          {headline ? (
            <p className="text-lg font-semibold leading-snug tracking-tight text-foreground sm:text-xl">
              {headline}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {freshness}
          {hasNext ? (
            <Link
              href={nextHref as string}
              className="inline-flex items-center gap-1 rounded-md text-sm font-medium text-foreground underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none"
            >
              {nextLabel}
              <span aria-hidden="true">→</span>
            </Link>
          ) : null}
        </div>
      </header>
    );
  },
);
PageConclusion.displayName = "PageConclusion";
