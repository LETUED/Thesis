import type { RiskTolerance } from "./types";

// 리스크 허용도 5단계 — 감정 라벨(표준편차·변동성 숫자 노출 금지).
// 슬라이더 index 0~4 ↔ enum 매핑. short=짧은 칩 라벨, headline=슬라이더 본문.
export interface EmotionLabel {
  value: RiskTolerance;
  short: string;
  headline: string;
}

export const EMOTION_LABELS: readonly EmotionLabel[] = [
  {
    value: "very_conservative",
    short: "안정 최우선",
    headline: "원금을 지키는 게 가장 마음 편합니다",
  },
  {
    value: "conservative",
    short: "신중",
    headline: "흔들림은 되도록 적었으면 합니다",
  },
  {
    value: "moderate",
    short: "균형",
    headline: "적당한 등락은 감수할 수 있습니다",
  },
  {
    value: "aggressive",
    short: "적극",
    headline: "수익 기회라면 변동성도 받아들입니다",
  },
  {
    value: "very_aggressive",
    short: "공격적",
    headline: "큰 기회를 위해 큰 변동도 견딥니다",
  },
] as const;
