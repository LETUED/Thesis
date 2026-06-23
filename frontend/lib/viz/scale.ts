import type { RegimeLabel, ThresholdHit } from "@/lib/types";

// 시각화 스케일/포맷 단일출처. 색은 globals.css 의 CSS 변수(--status-*, --regime-*)에 위임.
// 라벨은 '팔아라' 연상을 피한다: danger 도 '위험'이 아닌 '경계'.

export interface ThresholdStyle {
  label: string;
  colorVar: string; // hsl(var(--status-*)) — 텍스트/아이콘 색
  dotVar: string; // 점/배지용 (현재는 colorVar 와 동일, 의미 분리 위해 별도 노출)
}

export const THRESHOLD_STYLES: Record<ThresholdHit, ThresholdStyle> = {
  calm: {
    label: "안정",
    colorVar: "hsl(var(--status-calm))",
    dotVar: "hsl(var(--status-calm))",
  },
  neutral: {
    label: "중립",
    colorVar: "hsl(var(--status-neutral))",
    dotVar: "hsl(var(--status-neutral))",
  },
  warn: {
    label: "주의",
    colorVar: "hsl(var(--status-warn))",
    dotVar: "hsl(var(--status-warn))",
  },
  danger: {
    // '위험'은 '팔아라' 연상 회피로 "경계" 사용 (설계 철학 1·5).
    label: "경계",
    colorVar: "hsl(var(--status-danger))",
    dotVar: "hsl(var(--status-danger))",
  },
};

// 미지정/null 안전 헬퍼.
export function thresholdStyle(
  hit: ThresholdHit | null | undefined,
): ThresholdStyle | null {
  if (hit == null) return null;
  return THRESHOLD_STYLES[hit];
}

// regime label → 색 CSS 변수. lib/regime.ts(배지 전용 스타일)와 별개로,
// 그래프/스파크라인 등 단일 색이 필요한 곳에서 쓰는 가벼운 헬퍼.
const REGIME_COLOR_VARS: Record<RegimeLabel, string> = {
  리스크온: "hsl(var(--regime-on))",
  중립: "hsl(var(--regime-neutral))",
  리스크오프: "hsl(var(--regime-off))",
};

export function regimeColorVar(label: RegimeLabel): string {
  return REGIME_COLOR_VARS[label];
}

export interface FormatDeltaOptions {
  // true(기본): 양수에 '+' 부호 표기. false: 음수 부호만.
  sign?: boolean;
  // 소수 자릿수(기본 2).
  digits?: number;
  // 접미사(예: "%"). 기본 없음.
  suffix?: string;
}

// 증감 수치 포맷터. null/NaN 은 "—" 로 안전 처리.
export function formatDelta(
  n: number | null | undefined,
  options: FormatDeltaOptions = {},
): string {
  const { sign = true, digits = 2, suffix = "" } = options;
  if (n == null || Number.isNaN(n)) return "—";
  const fixed = Math.abs(n).toFixed(digits);
  const mark = n > 0 ? (sign ? "+" : "") : n < 0 ? "−" : "";
  return `${mark}${fixed}${suffix}`;
}
