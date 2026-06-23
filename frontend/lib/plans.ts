// 플랜 단일출처. components/landing/PricingPreview.tsx 의 플랜 정의를 그대로 반영한다.
// PricingPreview 자체는 수정하지 않으므로, 값이 어긋나지 않게 여기서 동일하게 유지한다.

export type PlanId = "free" | "pro" | "quant";

export interface Plan {
  id: PlanId;
  name: string;
  price: string;
  period: string;
  features: string[];
  cta: string;
  href: string | null;
  highlight: boolean;
}

export const PLANS: readonly Plan[] = [
  {
    id: "free",
    name: "Free",
    price: "₩0",
    period: "",
    features: ["시장 국면 신호", "기본 지표 3개", "단순 자산배분"],
    cta: "무료로 시작",
    href: "/signup",
    highlight: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: "₩9,900",
    period: "/월",
    features: ["실시간 데이터", "지표 상세 근거", "기업분석 · 포트폴리오 추적"],
    cta: "Pro 시작하기",
    href: "/signup",
    highlight: true,
  },
  {
    id: "quant",
    name: "Quant",
    price: "₩29,900",
    period: "/월",
    features: ["Pro 전체", "API · 커스텀 스크리너", "백테스트"],
    cta: "준비 중",
    href: null,
    highlight: false,
  },
] as const;

export function getPlan(id: PlanId): Plan {
  const plan = PLANS.find((p) => p.id === id);
  if (!plan) throw new Error(`Unknown plan id: ${id}`);
  return plan;
}

// 기능 매트릭스(비교표 단일출처). 각 기능이 플랜별로 포함되는지.
export interface FeatureRow {
  feature: string;
  free: boolean;
  pro: boolean;
  quant: boolean;
}

export const featureMatrix: readonly FeatureRow[] = [
  { feature: "시장 국면 신호", free: true, pro: true, quant: true },
  { feature: "기본 지표 3개", free: true, pro: true, quant: true },
  { feature: "단순 자산배분", free: true, pro: true, quant: true },
  { feature: "실시간 데이터", free: false, pro: true, quant: true },
  { feature: "지표 상세 근거", free: false, pro: true, quant: true },
  { feature: "기업분석 · 포트폴리오 추적", free: false, pro: true, quant: true },
  { feature: "API · 커스텀 스크리너", free: false, pro: false, quant: true },
  { feature: "백테스트", free: false, pro: false, quant: true },
] as const;
