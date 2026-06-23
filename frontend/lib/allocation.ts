import type { AssetMix, ThresholdHit } from "./types";

// 자산배분 제약 단일출처. CLAUDE.md 임계값(현금 최소 20%·단일종목 최대 15%)을 코드에 박지 않고 여기로 모은다.
export const ALLOCATION_CONSTRAINTS = {
  cashFloorPct: 20, // 현금 최소 비중
  singleStockCapPct: 15, // 단일 종목 최대 비중
} as const;

export interface ConstraintBullet {
  key: string;
  label: string;
  value: number; // mix 에서 온 현재 값(Pro 에서 막대 수치로 노출)
  threshold: number; // 제약 임계(참고선)
  kind: "floor" | "cap"; // 하한/상한 — 충족 방향 구분
  status: ThresholdHit; // 제약 충족 여부 정성 라벨(색 단독 금지 → StatusPill 텍스트 병기)
  caption: string; // 입문자용 한 줄 설명(명령 톤 금지)
}

// 하한(floor): 값이 임계 이상이어야 안정. 미달 폭에 따라 경계 상향.
function floorStatus(value: number, floor: number): ThresholdHit {
  if (value >= floor) return "calm";
  if (value >= floor - 5) return "warn";
  return "danger";
}

// 상한(cap): 값이 임계 이하여야 안정. 초과 폭에 따라 경계 상향.
function capStatus(value: number, cap: number): ThresholdHit {
  if (value <= cap) return "calm";
  if (value <= cap + 5) return "warn";
  return "danger";
}

// mix 값으로 제약 대비 불릿 행을 만든다.
// - 현금: cash_pct 를 최소 20% 하한과 비교(실측 대비).
// - 주식(단일): 한 종목 상한 15% 는 mix(총주식)와 의미가 달라, 상한을 참고선으로 두고
//   총주식 비중을 같은 스케일 위에 얹어 "한 종목이 이 한도를 넘지 않게" 분산 기준을 보인다.
export function buildConstraintBullets(mix: AssetMix): ConstraintBullet[] {
  const { cashFloorPct, singleStockCapPct } = ALLOCATION_CONSTRAINTS;
  return [
    {
      key: "cash-floor",
      label: "현금 비중",
      value: mix.cash_pct,
      threshold: cashFloorPct,
      kind: "floor",
      status: floorStatus(mix.cash_pct, cashFloorPct),
      caption: `최소 ${cashFloorPct}% 현금을 남겨 변동성에 대비하는 기준입니다.`,
    },
    {
      key: "single-stock-cap",
      label: "주식 한 종목 한도",
      value: singleStockCapPct,
      threshold: singleStockCapPct,
      kind: "cap",
      status: capStatus(singleStockCapPct, singleStockCapPct),
      caption: `한 종목에 ${singleStockCapPct}%를 넘기지 않는 분산 기준입니다.`,
    },
  ];
}
