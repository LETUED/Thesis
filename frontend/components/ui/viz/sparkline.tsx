"use client";

import * as React from "react";
import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts";
import { cn } from "@/lib/utils/cn";

type Variant = "schematic" | "real";

export interface SparklineProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "color"> {
  data?: number[] | null;
  variant?: Variant;
  // 접근성 라벨(필수에 가깝게 운영) — 미지정 시 variant 기반 기본 문구.
  ariaLabel?: string;
}

// 색은 토큰에 위임. real=중립 선(--status-neutral), schematic=저채도 점선 도식.
const STROKE_VAR: Record<Variant, string> = {
  schematic: "hsl(var(--muted-foreground))",
  real: "hsl(var(--status-neutral))",
};

// schematic 은 '실수치 아님'을 분명히 하기 위한 고정 도식 형태(가짜 데이터 금지 → 단조 곡선).
// 일부러 의미 없는 완만한 파형으로, 추세를 암시하지 않는다.
const SCHEMATIC_SHAPE = [3, 4, 3.5, 5, 4.5, 6, 5.5, 7];

function toSeries(values: number[]): { i: number; v: number }[] {
  return values.map((v, i) => ({ i, v }));
}

// 미니 라인 스파크라인. Free=schematic(도식, 실수치 아님), Pro=real(실제 시계열).
export function Sparkline({
  className,
  data,
  variant = "real",
  ariaLabel,
  ...props
}: SparklineProps) {
  const isSchematic = variant === "schematic";
  const values =
    isSchematic || !data || data.length < 2 ? SCHEMATIC_SHAPE : data;
  const series = toSeries(values);
  const stroke = isSchematic ? STROKE_VAR.schematic : STROKE_VAR[variant];

  const resolvedLabel =
    ariaLabel ??
    (isSchematic
      ? "추세 도식 (실제 수치는 Pro에서 제공)"
      : "최근 추세 미니 차트");

  return (
    <div
      role="img"
      aria-label={resolvedLabel}
      className={cn("h-5 w-full", isSchematic && "opacity-50", className)}
      {...props}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={series}
          margin={{ top: 2, right: 1, bottom: 2, left: 1 }}
        >
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <Line
            type="monotone"
            dataKey="v"
            stroke={stroke}
            strokeWidth={1.5}
            strokeDasharray={isSchematic ? "3 3" : undefined}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
