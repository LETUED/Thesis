import * as React from "react";
import { cn } from "@/lib/utils/cn";

// 확신도 3칸 막대. RegimeSignalCard 인라인 버전을 추출 — regime·allocation 공용.
// 숫자 점수 직접 노출 금지: 막대 칸 + 확률적 라벨 텍스트로만 표현(색 단독 의존 금지, sr-only 보존).
type ConfidenceLevel = "weak" | "moderate" | "strong";

// level 동등 입력 허용: allocation 의 "low"|"moderate"|"high" 등도 받아들인다.
const LEVEL_FILLED: Record<ConfidenceLevel, number> = {
  weak: 1,
  moderate: 2,
  strong: 3,
};

const LEVEL_TEXT: Record<ConfidenceLevel, string> = {
  weak: "약함",
  moderate: "보통",
  strong: "강함",
};

// 도메인별 라벨(low/high 등)을 공용 weak|moderate|strong 으로 정규화.
function normalizeLevel(level: string): ConfidenceLevel {
  switch (level) {
    case "weak":
    case "low":
      return "weak";
    case "strong":
    case "high":
      return "strong";
    default:
      return "moderate";
  }
}

const TOTAL_BARS = 3;

export interface ConfidenceMeterProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "color"> {
  // "weak"|"moderate"|"strong" 또는 동등(예: "low"|"high").
  level: string;
  // 확률적 라벨(probabilistic_label). 막대 옆 텍스트로 병기.
  label?: string;
  // 보조 설명(confidence.rationale). 있으면 막대 아래 노출.
  rationale?: string | null;
  // 채워진 막대 색(시맨틱 토큰 hsl 문자열). 미지정 시 foreground.
  fillColor?: string;
}

export function ConfidenceMeter({
  level,
  label,
  rationale,
  fillColor,
  className,
  ...props
}: ConfidenceMeterProps) {
  const normalized = normalizeLevel(level);
  const filled = LEVEL_FILLED[normalized];
  const levelText = LEVEL_TEXT[normalized];
  const filledColor = fillColor ?? "hsl(var(--foreground))";

  return (
    <div className={className} {...props}>
      <div className="flex items-center gap-3">
        <span className="sr-only">
          확신도 {levelText}
          {label ? ` — ${label}` : ""}
        </span>
        <div className="flex gap-1" aria-hidden>
          {Array.from({ length: TOTAL_BARS }, (_, i) => (
            <span
              key={i}
              className="h-2 w-8 rounded-full"
              style={{
                backgroundColor:
                  i < filled ? filledColor : "hsl(var(--muted))",
              }}
            />
          ))}
        </div>
        {label ? (
          <span className="text-sm font-medium">{label}</span>
        ) : null}
      </div>
      {rationale ? (
        <p className={cn("mt-2 text-xs text-muted-foreground")}>{rationale}</p>
      ) : null}
    </div>
  );
}
