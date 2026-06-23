"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface BlurTeaserProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  // 흐림 처리할 Pro 콘텐츠의 "형태"만 담은 요소. raw 데이터 금지 — 글리프/레이아웃만.
  children: React.ReactNode;
  // 가려진 영역이 무엇인지 설명하는 문구(오버레이 + SR 공용).
  label: string;
  // locked_summary — "가려진 것의 형태/개수"를 알려주는 텍스트(raw 값 아님).
  summary?: string[];
  // 펼쳐보기 CTA 슬롯(예: UpgradeButton). 누락 시 오버레이 라벨만 노출.
  onUnlock?: React.ReactNode;
}

// 실제 Pro 콘텐츠의 형태를 흐림으로 미리보기.
// blur 뒤 children 은 글리프/형태만(raw 값 절대 금지) + aria-hidden + 상호작용 차단.
// 접근성 정보는 sr-only 텍스트(라벨 + 요약)로만 제공. 색/hover 단독 의존 금지.
export const BlurTeaser = React.forwardRef<HTMLDivElement, BlurTeaserProps>(
  ({ className, children, label, summary, onUnlock, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "relative overflow-hidden rounded-lg border border-border bg-muted",
          className,
        )}
        {...props}
      >
        {/* 흐림 대상: 형태만 보이고 스크린리더/포인터/탭에서 완전히 차단 */}
        <div
          aria-hidden="true"
          className="select-none pointer-events-none blur-sm"
        >
          {children}
        </div>

        {/* 오버레이: 자물쇠 + 라벨 + 펼쳐보기 CTA 슬롯 */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/40 p-4 text-center">
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            {label}
          </span>

          {summary && summary.length > 0 ? (
            <ul className="space-y-0.5 text-xs text-muted-foreground">
              {summary.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          ) : null}

          {onUnlock ?? null}
        </div>

        {/* 접근성: 흐림 뒤 형태가 아닌 의미만 SR 에 전달 */}
        <p className="sr-only">
          {`Pro 잠금: ${label}`}
          {summary && summary.length > 0 ? `. ${summary.join(". ")}` : ""}
        </p>
      </div>
    );
  },
);
BlurTeaser.displayName = "BlurTeaser";
