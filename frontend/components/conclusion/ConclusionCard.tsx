import * as React from "react";
import { Panel } from "@/components/ui/panel";
import { Chip } from "@/components/ui/chip";
import { NoticeBanner } from "@/components/ui/notice-banner";
import { cn } from "@/lib/utils/cn";

// 도메인 무관 평결 카드 골격(Panel 기반). 데이터 결합 금지 — 순수 슬롯 컴포넌트.
// "결론 먼저, 근거는 펼쳐보기" 레이아웃: eyebrow+label → headline → confidence → drivers → children(evidence) → disclaimer.
// RegimeSignalCard·Allocation·기업분석이 이 위 thin wrapper 가 될 수 있도록 충분히 유연하게 둔다.
// 과신방지: "사세요" 같은 명령 톤 금지(문구는 소비처 데이터에서 옴), 색 단독 의존 금지.

// 라벨 칩: 텍스트 + 선택적 인라인 스타일(시맨틱 토큰 hsl). 색만으로 의미를 전달하지 않도록 text 필수.
export interface ConclusionLabel {
  text: string;
  style?: React.CSSProperties;
}

export interface ConclusionCardProps
  extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  // 소제목(예: "매크로 · 시장 국면").
  eyebrow?: string;
  // 라벨 칩(예: 국면 라벨 배지). 색은 style 로, 의미는 text 로 병기.
  label?: ConclusionLabel;
  // 결론 한 줄(필수).
  headline: string;
  // 확신도 슬롯(ConfidenceMeter 등). 도메인 결합을 피하기 위해 ReactNode 로 받는다.
  confidence?: React.ReactNode;
  // 주요 근거 방향(top_drivers 등) — 수치 없이 Chip 으로 렌더.
  drivers?: string[];
  // evidence 슬롯(EvidenceLocked 또는 상세 근거).
  children?: React.ReactNode;
  // 응답 disclaimer. 있으면 NoticeBanner 로 노출.
  disclaimer?: string;
}

export function ConclusionCard({
  eyebrow,
  label,
  headline,
  confidence,
  drivers,
  children,
  disclaimer,
  className,
  ...props
}: ConclusionCardProps) {
  return (
    <Panel className={cn("space-y-5", className)} {...props}>
      <div>
        {eyebrow || label ? (
          <div className="flex items-center justify-between gap-3">
            {eyebrow ? (
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {eyebrow}
              </p>
            ) : (
              <span />
            )}
            {label ? (
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold"
                style={label.style}
              >
                {label.style?.color ? (
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: label.style.color }}
                    aria-hidden
                  />
                ) : null}
                {label.text}
              </span>
            ) : null}
          </div>
        ) : null}
        <p className="mt-2 text-xl font-semibold leading-snug">{headline}</p>
      </div>

      {confidence ? <div>{confidence}</div> : null}

      {drivers && drivers.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {drivers.map((d, i) => (
            <Chip key={`${d}-${i}`} variant="muted">
              {d}
            </Chip>
          ))}
        </div>
      ) : null}

      {children}

      {disclaimer ? (
        <NoticeBanner
          tone="info"
          className="gap-2 text-xs [&>svg]:mt-0.5 [&>svg]:h-4 [&>svg]:w-4"
        >
          <span>{disclaimer}</span>
        </NoticeBanner>
      ) : null}
    </Panel>
  );
}
