"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import NumberFlow from "@number-flow/react";
import type { AssetMix } from "@/lib/types";

// 주식/현금/안전자산 도넛. 중앙에 risk_label_text. Recharts SSR 불가 → 'use client'.
// 색상: 주식=emerald(regime-on), 현금=slate(neutral), 안전자산=amber(off).
const SLICE_COLORS = [
  "hsl(var(--regime-on))",
  "hsl(var(--regime-neutral))",
  "hsl(var(--regime-off))",
];

export function AllocationDonut({
  mix,
  centerText,
}: {
  mix: AssetMix;
  centerText: string;
}) {
  const data = [
    { name: "주식", value: mix.stocks_pct },
    { name: "현금", value: mix.cash_pct },
    { name: "안전자산", value: mix.safe_pct },
  ];

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
      <div
        className="relative h-44 w-44 shrink-0"
        role="img"
        aria-label={`${centerText}. 자산배분: 주식 ${mix.stocks_pct.toFixed(0)}퍼센트, 현금 ${mix.cash_pct.toFixed(0)}퍼센트, 안전자산 ${mix.safe_pct.toFixed(0)}퍼센트`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={58}
              outerRadius={84}
              startAngle={90}
              endAngle={-270}
              stroke="hsl(var(--background))"
              strokeWidth={2}
              isAnimationActive={false}
            >
              {data.map((entry, i) => (
                <Cell key={entry.name} fill={SLICE_COLORS[i]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-2 text-center">
          <span className="text-xs leading-tight text-muted-foreground">
            {centerText}
          </span>
        </div>
      </div>

      <ul className="space-y-2 text-sm">
        {data.map((entry, i) => (
          <li key={entry.name} className="flex items-center gap-2">
            <span
              className="h-3 w-3 rounded-sm"
              style={{ backgroundColor: SLICE_COLORS[i] }}
              aria-hidden
            />
            <span className="w-16 text-muted-foreground">{entry.name}</span>
            <span className="font-medium tabular-nums">
              <NumberFlow value={Math.round(entry.value)} suffix="%" />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
