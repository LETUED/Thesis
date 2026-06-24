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

// 국면 라벨의 입문자용 한 줄 풀이(철학3: 입문자 보호 — '리스크온' 같은 용어를 그대로 두지 않는다).
// '매도'·행동 강요 톤 금지. RegimeSpectrum 의 양끝 병기(위험 회피/선호)와 톤 일관.
export const REGIME_HINT: Record<RegimeLabel, string> = {
  리스크온: "위험을 감수할 만한 흐름",
  중립: "한쪽으로 치우치지 않는 구간",
  리스크오프: "위험을 줄이는 게 우선인 흐름",
};

// 확신도 막대 칸 수(weak=1, moderate=2, strong=3). 숫자 점수 직접 노출 금지.
export const CONFIDENCE_BARS: Record<ConfidenceLevel, number> = {
  weak: 1,
  moderate: 2,
  strong: 3,
};
