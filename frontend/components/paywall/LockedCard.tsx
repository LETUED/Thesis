import * as React from "react";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { BlurTeaser } from "@/components/ui/blur-teaser";
import { UpsellInline } from "@/components/billing/UpsellInline";
import { UpgradeButton } from "@/components/billing/UpgradeButton";
import { UPSELL_COPY, type UpsellSource } from "@/lib/upsell";

// Pro 잠금 표현 통합 컴포넌트(lab 전용 잠금 제외).
// mode="card": 점선 박스 + 자물쇠 + summary 형태 미리보기 + UpsellInline CTA.
// mode="blur": children(형태/글리프만, raw 값 금지)을 BlurTeaser 로 흐림 + 펼쳐보기 CTA.
// 카피는 UPSELL_COPY 단일출처. 과신 방지 톤(행동 강요·수익 보장 문구 없음).
export interface LockedCardProps {
  mode: "card" | "blur";
  source: UpsellSource;
  // 가려진 것의 "형태/개수"만 알려주는 미리보기 텍스트(raw 값 아님).
  summary?: string[];
  // blur 모드에서 흐림 처리할 형태 전용 콘텐츠(raw 데이터 금지).
  children?: React.ReactNode;
  className?: string;
}

export function LockedCard({
  mode,
  source,
  summary,
  children,
  className,
}: LockedCardProps) {
  const copy = UPSELL_COPY[source];

  if (mode === "blur") {
    return (
      <BlurTeaser
        label={copy.title}
        summary={summary}
        className={className}
        onUnlock={
          <UpgradeButton label="Pro에서 펼쳐보기" variant="default" size="sm" />
        }
      >
        {children}
      </BlurTeaser>
    );
  }

  return (
    <div
      className={cn(
        "rounded-md border border-dashed border-border bg-muted/40 p-4",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Lock className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{copy.title}</p>
          {summary && summary.length > 0 ? (
            <ul className="mt-1 space-y-0.5 text-sm text-muted-foreground">
              {summary.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          ) : null}
          <UpsellInline source={source} className="mt-3" />
        </div>
      </div>
    </div>
  );
}
