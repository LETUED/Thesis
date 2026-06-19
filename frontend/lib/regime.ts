import type { ConfidenceLevel, RegimeLabel } from "./types";

// 라벨별 색상/문구 매핑. '매도' 단어 금지 — 리스크오프도 '위험 회피' 톤.
// 색상은 globals.css 의 CSS 변수(--regime-*)를 인라인 style 로 참조한다.
interface RegimeStyle {
  badgeBg: string; // hsl var
  badgeText: string;
  dot: string;
}

export const REGIME_STYLES: Record<RegimeLabel, RegimeStyle> = {
  리스크온: {
    badgeBg: "hsl(var(--regime-on) / 0.12)",
    badgeText: "hsl(var(--regime-on))",
    dot: "hsl(var(--regime-on))",
  },
  중립: {
    badgeBg: "hsl(var(--regime-neutral) / 0.12)",
    badgeText: "hsl(var(--regime-neutral))",
    dot: "hsl(var(--regime-neutral))",
  },
  리스크오프: {
    badgeBg: "hsl(var(--regime-off) / 0.14)",
    badgeText: "hsl(var(--regime-off))",
    dot: "hsl(var(--regime-off))",
  },
};

// 확신도 막대 칸 수(weak=1, moderate=2, strong=3). 숫자 점수 직접 노출 금지.
export const CONFIDENCE_BARS: Record<ConfidenceLevel, number> = {
  weak: 1,
  moderate: 2,
  strong: 3,
};
