// 백엔드 app/models.py (Pydantic v2) 1:1 미러. any 금지.
// datetime 필드는 JSON 직렬화 시 ISO 문자열로 오므로 TS에서는 string 으로 타이핑한다(Date 아님).

// ── 공통 리터럴 유니언 (enum 미러) ────────────────────────────────────────
export type Tier = "free" | "pro";
export type RegimeLabel = "리스크온" | "중립" | "리스크오프";
export type RiskTolerance =
  | "very_conservative"
  | "conservative"
  | "moderate"
  | "aggressive"
  | "very_aggressive";
export type InvestmentHorizon = "short" | "mid" | "long";
export type Layer = "L1" | "L2" | "L3" | "L4";

export type ConfidenceLevel = "weak" | "moderate" | "strong";
export type AllocationConfidence = "low" | "moderate" | "high";
export type TrendLabel =
  | "uptrend"
  | "downtrend"
  | "sideways"
  | "insufficient_data";
export type MetricStatus = "ok" | "stale" | "failed";
export type CacheStatus = "fresh" | "cached" | "stale";
export type ThresholdHit = "calm" | "neutral" | "warn" | "danger";
export type SectorDirection = "overweight" | "neutral" | "underweight";
export type MetricSource = "yfinance" | "stub";

// ── 공통 evidence 잠금 placeholder ────────────────────────────────────────
export interface EvidenceLocked {
  locked: true;
  required_tier: Tier;
  preview: string;
  // 가려진 것의 "형태/개수"만 알려주는 미리보기 텍스트(raw 값 아님). BlurTeaser SR/요약에 노출.
  locked_summary?: string[] | null;
}

// 타입가드: evidence union 을 EvidenceLocked 로 좁힐 때만 사용.
export function isLocked(
  evidence: unknown,
): evidence is EvidenceLocked {
  return (
    typeof evidence === "object" &&
    evidence !== null &&
    "locked" in evidence &&
    (evidence as { locked: unknown }).locked === true
  );
}

// ── regime 도메인 ─────────────────────────────────────────────────────────
export interface Confidence {
  level: ConfidenceLevel;
  score: number | null; // 0~1 — Pro 전용(Free 응답에선 null 마스킹)
  probabilistic_label: string;
  rationale?: string | null;
}

export interface RegimeConclusion {
  label: RegimeLabel;
  headline: string;
  confidence: Confidence;
  top_drivers: string[];
}

export interface IndicatorContribution {
  ticker: string;
  display_name: string;
  raw_value: number | null;
  contribution: number; // [-1, +1]
  weight: number;
  direction: string;
  threshold_hit?: ThresholdHit | null;
  comparison_text: string;
}

export interface RegimeEvidence {
  score: number; // [-100, +100]
  coverage: number; // 0~1
  consensus: number; // 0~1
  contributions: IndicatorContribution[];
  layer_breakdown: Record<string, number>;
  as_of: string;
}

export interface RegimeResult {
  conclusion: RegimeConclusion;
  evidence: RegimeEvidence | EvidenceLocked | null;
  disclaimer: string;
  tier: Tier;
  cache_status: CacheStatus;
  generated_at: string;
}

// ── allocation 도메인 ─────────────────────────────────────────────────────
export interface AssetMix {
  stocks_pct: number;
  cash_pct: number;
  safe_pct: number;
}

export interface SectorTilt {
  sector: string;
  direction: SectorDirection;
  rationale: string;
}

export interface ConstraintNote {
  name: string;
  applied: boolean;
  message: string;
}

export interface AllocationRequest {
  risk_tolerance: RiskTolerance;
  horizon: InvestmentHorizon;
  reflect_current_regime: boolean;
  tier: Tier;
}

export interface AllocationConclusion {
  mix: AssetMix;
  headline: string;
  risk_label_text: string;
  sector_tilts_summary: string[];
}

export interface AllocationEvidence {
  regime_reasons: string[];
  korea_signals: string[];
  constraint_notes: ConstraintNote[];
  base_matrix_cell: string;
  sector_tilts: SectorTilt[];
}

export interface AllocationResult {
  conclusion: AllocationConclusion;
  evidence: AllocationEvidence | EvidenceLocked | null;
  confidence: AllocationConfidence;
  disclaimer: string;
  tier: Tier;
  cache_status: CacheStatus; // 배분이 기반한 시장 데이터 신선도(stale 이면 갱신 지연 고지)
  generated_at: string;
}

// ── indicators 도메인 ─────────────────────────────────────────────────────
export interface TrendInfo {
  label: TrendLabel;
  sma5?: number | null;
  sma20?: number | null;
}

export interface TickerMetric {
  symbol: string;
  layer: Layer;
  display_name: string;
  free_visible: boolean;
  latest?: number | null;
  prev_close?: number | null;
  change_pct?: number | null;
  trend: TrendInfo;
  status: MetricStatus;
  threshold_status?: ThresholdHit | null;
  error?: string | null;
  fetched_at: string;
  source: MetricSource;
}

export interface ForeignFlowStub {
  available: boolean;
  source: "pykrx" | "stub";
  market: string;
  consecutive_sell_days: number | null;
  net_buy_latest_krw_eok: number | null;
  net_buy: number | null;
  series: [string, number][] | null;
  asof: string;
  note: string;
}

export interface MarketSnapshot {
  generated_at: string;
  cache_status: CacheStatus;
  metrics: TickerMetric[];
  foreign_flow: ForeignFlowStub;
  failed_symbols: string[];
  partial: boolean;
  disclaimer: string;
}

// ── 기업 재무(/lab) — 백엔드 CompanyFundamentals 미러(snake_case) ─────────────
export interface CompanyFundamentals {
  id: string; // ISIN
  name: string;
  ticker: string;
  yahoo: string;
  exchange: string;
  country: string;
  aliases: string[];
  forward_per: number | null;
  roe: number | null;
  op_margin: number | null;
  revenue_growth: number | null;
  net_margin: number | null;
  pbr: number | null;
  debt_to_equity: number | null;
  dividend_yield: number | null;
  source: string; // dart / yfinance / dart+yfinance / +mock / mock
  period: string; // DART 재무 기준 분기(예: "2026 1분기"). 비-DART/실패 시 ""
  asof: string;
  partial: boolean;
}

// 기업 검색 디렉토리 엔트리(식별자만, 재무 없음) — /api/companies/search 결과.
export interface CompanyDirectoryEntry {
  id: string; // ISIN 또는 한국 종목코드(6자리)/미국 티커
  name: string;
  ticker: string;
  exchange: string;
  country: string;
}

// ── 공통 응답 ─────────────────────────────────────────────────────────────
export interface HealthResponse {
  status: "ok" | "degraded";
  version: string;
  server_time: string;
  cache_warm: boolean;
}

export interface ErrorDetail {
  code: string;
  message: string;
  request_id?: string | null;
}

export interface ErrorResponse {
  error: ErrorDetail;
}
