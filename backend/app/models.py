"""전 모듈 공용 Pydantic v2 모델 — 인터페이스 계약의 단일 진실.

collector / regime / allocation / routes 가 모두 이 모델을 import 한다.
free/pro 티어 경계는 (1) 필드 json_schema_extra={'tier':...} 메타와
(2) 응답 구성(evidence Optional, *Locked placeholder)으로 이중 명시한다.

철학 강제:
- disclaimer 는 모든 투자성 응답의 필수 필드(Optional 아님).
- conclusion(free) 과 evidence(pro) 물리 분리.
- confidence 는 항상 확률적 라벨 + 0~1 점수 (단정 금지).
- '매도' 동사는 어떤 라벨/문구에도 등장하지 않는다.
"""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.tickers import Layer

__all__ = [
    "Tier", "Layer", "RegimeLabel", "RiskToleranceLabel", "InvestmentHorizon",
    "Disclaimer", "TrendInfo", "TickerMetric", "ForeignFlowStub", "ForeignFlowReading", "MarketSnapshot",
    "IndicatorReading", "IndicatorRuleView", "IndicatorContribution",
    "Confidence", "RegimeConclusion", "RegimeEvidence", "RegimeResult",
    "AssetMix", "SectorTilt", "ConstraintNote", "ConstraintCheck",
    "AllocationRequest", "AllocationConclusion", "AllocationEvidence", "AllocationResult",
    "HealthResponse", "ResponseMeta", "EvidenceLocked", "CompanyFundamentals",
    "ErrorDetail", "ErrorResponse", "now_utc",
]


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _free(**kw: object) -> dict:
    return {"tier": "free", **kw}


def _pro(**kw: object) -> dict:
    return {"tier": "pro", **kw}


# ── 공통 enum ───────────────────────────────────────────────────────────────


class Tier(str, Enum):
    FREE = "free"
    PRO = "pro"


class RegimeLabel(str, Enum):
    """종합 결론 라벨. '매도/위험확정' 단정 금지 — RISK_OFF 가 최고 경계 톤."""

    RISK_ON = "리스크온"
    NEUTRAL = "중립"
    RISK_OFF = "리스크오프"


class RiskToleranceLabel(str, Enum):
    """리스크 허용도 5단계 (감정 라벨, 표준편차 금지)."""

    VERY_CONSERVATIVE = "very_conservative"
    CONSERVATIVE = "conservative"
    MODERATE = "moderate"
    AGGRESSIVE = "aggressive"
    VERY_AGGRESSIVE = "very_aggressive"


class InvestmentHorizon(str, Enum):
    SHORT = "short"  # <1년
    MID = "mid"  # 1~3년
    LONG = "long"  # 3년+


# ── 공통 면책 ───────────────────────────────────────────────────────────────


class Disclaimer(BaseModel):
    """모든 투자성 응답 필수. is_advice 는 항상 False 강제."""

    text: str
    is_advice: Literal[False] = False


# ── collector 도메인 ────────────────────────────────────────────────────────

TrendLabel = Literal["uptrend", "downtrend", "sideways", "insufficient_data"]
MetricStatus = Literal["ok", "stale", "failed"]
CacheStatus = Literal["fresh", "cached", "stale"]
# 임계값 분류 라벨 — collector(TickerMetric) 와 regime(IndicatorContribution) 공용.
ThresholdHit = Literal["calm", "neutral", "warn", "danger"]


class TrendInfo(BaseModel):
    """추세 라벨(free) + 원시 이동평균(pro)."""

    label: TrendLabel = Field(json_schema_extra=_free())
    sma5: float | None = Field(default=None, json_schema_extra=_pro())
    sma20: float | None = Field(default=None, json_schema_extra=_pro())


class TickerMetric(BaseModel):
    """단일 티커 표준화 관측치. collector 산출물."""

    symbol: str = Field(json_schema_extra=_free())
    layer: Layer = Field(json_schema_extra=_free())
    display_name: str = Field(json_schema_extra=_free())
    free_visible: bool = Field(default=False, json_schema_extra=_free())

    latest: float | None = Field(default=None, json_schema_extra=_pro())
    prev_close: float | None = Field(default=None, json_schema_extra=_pro())
    change_pct: float | None = Field(default=None, json_schema_extra=_free())
    trend: TrendInfo = Field(default_factory=lambda: TrendInfo(label="insufficient_data"))

    status: MetricStatus = Field(default="ok", json_schema_extra=_free())
    # 임계값(calm/neutral/warn/danger) 분류 — 임계값 규칙이 있는 지표만 채움(없으면 None).
    # Free 결론 신호용이므로 마스킹하지 않는다(_free). 원시 level(latest 등)은 pro 유지.
    threshold_status: ThresholdHit | None = Field(default=None, json_schema_extra=_free())
    error: str | None = Field(default=None, json_schema_extra=_pro())
    fetched_at: datetime = Field(default_factory=now_utc)
    source: Literal["yfinance", "stub"] = "yfinance"


class ForeignFlowReading(BaseModel):
    """외국인 순매수 관측치.

    하위호환: 과거 ForeignFlowStub(available=False, source='stub') 표현을 그대로
    포함하면서, KRX 회원계정(pykrx) 연동 성공 시 실데이터(available=True,
    source='pykrx')도 담을 수 있게 확장한다. 가짜 숫자 금지(철학7): 데이터 미수집
    이면 available=False 를 유지하고 수치 필드는 None 으로 둔다.

    consecutive_sell_days: 최신일부터 역순으로 센 외국인 연속 순매도일.
    net_buy_latest_krw_eok: 최신 영업일 외국인 순매수(억원, 음수=순매도).
    series: (날짜ISO, 순매수 억원) 시계열 — pro 근거용. 미수집이면 None.
    """

    available: bool = False
    source: Literal["pykrx", "stub"] = "stub"
    market: str = "KOSPI"
    consecutive_sell_days: int | None = None
    net_buy_latest_krw_eok: float | None = None
    # 하위호환 별칭: 과거 net_buy 필드를 참조하던 코드가 깨지지 않게 유지.
    net_buy: float | None = None
    series: list[tuple[str, float]] | None = None
    asof: datetime = Field(default_factory=now_utc)
    note: str = "외국인 순매수 데이터 미수집 — KRX 회원계정(pykrx) 연동 필요"


# 과거 이름 하위호환: collector/snapshot 이 ForeignFlowStub 를 import 한다.
ForeignFlowStub = ForeignFlowReading


class MarketSnapshot(BaseModel):
    """collect_all 산출물. 부분 실패 혼재 가능."""

    generated_at: datetime = Field(default_factory=now_utc)
    cache_status: CacheStatus = "fresh"
    metrics: list[TickerMetric] = Field(default_factory=list)  # layer 오름차순
    foreign_flow: ForeignFlowStub = Field(default_factory=ForeignFlowStub)
    failed_symbols: list[str] = Field(default_factory=list)
    partial: bool = False
    disclaimer: str = ""


# ── regime 도메인 ───────────────────────────────────────────────────────────


class IndicatorReading(BaseModel):
    """regime 엔진 입력: 정규화 전 원시 관측치 (collector → regime 어댑터가 채움)."""

    ticker: str
    layer: Layer
    display_name: str
    value: float | None = None  # 레벨형 지표용
    change_pct: float | None = None  # 모멘텀형 지표용
    asof: datetime = Field(default_factory=now_utc)
    is_stale: bool = False
    source: Literal["yfinance", "stub", "pykrx"] = "yfinance"


class IndicatorRuleView(BaseModel):
    """규칙의 응답 노출용 뷰(pro). config.IndicatorRule 의 직렬화 표면."""

    ticker: str
    display_name: str
    direction: str
    metric: str
    calm_threshold: float | None = None
    warn_threshold: float | None = None
    danger_threshold: float | None = None
    weight: float


class IndicatorContribution(BaseModel):
    """[PRO ONLY] 지표별 근거. evidence 에만 노출."""

    model_config = ConfigDict(json_schema_extra={"tier": "pro"})

    ticker: str
    display_name: str
    raw_value: float | None
    contribution: float  # [-1, +1]
    weight: float
    direction: str
    threshold_hit: ThresholdHit | None = None
    comparison_text: str  # '원달러 1,420원 — 주의 임계값 1,400 초과'


class Confidence(BaseModel):
    """확신도. 표준편차 노출 금지 — 항상 확률적 라벨."""

    level: Literal["weak", "moderate", "strong"] = Field(json_schema_extra=_free())
    score: float = Field(ge=0.0, le=1.0, json_schema_extra=_free())
    probabilistic_label: str = Field(json_schema_extra=_free())  # '비교적 뚜렷한 신호입니다'
    rationale: str | None = Field(default=None, json_schema_extra=_pro())


class RegimeConclusion(BaseModel):
    """[FREE] 무료 노출 결론. 절대 수치 노출 안 함."""

    label: RegimeLabel
    headline: str  # '현재 시장은 위험 회피 성향이 강해지고 있습니다'
    confidence: Confidence
    top_drivers: list[str] = Field(default_factory=list)  # 방향만, 수치 없이


class RegimeEvidence(BaseModel):
    """[PRO] 상세 근거. score/임계값 비교/레이어 기여."""

    model_config = ConfigDict(json_schema_extra={"tier": "pro"})

    score: float  # [-100, +100]
    coverage: float = Field(ge=0.0, le=1.0)
    consensus: float = Field(ge=0.0, le=1.0)
    contributions: list[IndicatorContribution] = Field(default_factory=list)
    layer_breakdown: dict[str, float] = Field(default_factory=dict)
    as_of: datetime = Field(default_factory=now_utc)


class EvidenceLocked(BaseModel):
    """free 플랜에서 evidence 자리에 들어가는 잠금 placeholder."""

    locked: Literal[True] = True
    required_tier: Tier = Tier.PRO
    preview: str = "Pro에서 지표별 상세 근거와 임계값 비교를 확인하실 수 있습니다."
    # [FREE] 가려진 항목의 '라벨만' 미리보기(수치 0/없음). 어떤 값/수치도 담지 않는다 —
    # Pro 결핍을 보여주기 위한 라벨 목록뿐이라 마스킹 대상이 아니다. 하위호환: 기본 None.
    locked_summary: list[str] | None = Field(default=None, json_schema_extra=_free())


class RegimeResult(BaseModel):
    """최상위 regime 응답. tier 에 따라 evidence 게이팅."""

    conclusion: RegimeConclusion
    evidence: RegimeEvidence | EvidenceLocked | None = None
    disclaimer: str  # 필수, 누락 불가
    tier: Tier = Tier.FREE
    cache_status: CacheStatus = "fresh"  # 데이터 신선도. 'stale'이면 프론트가 갱신 지연 고지(철학5).
    generated_at: datetime = Field(default_factory=now_utc)


# ── allocation 도메인 ───────────────────────────────────────────────────────


class AssetMix(BaseModel):
    """자산 클래스 비율. 불변식: stocks+cash+safe == 100, cash >= MIN_CASH."""

    stocks_pct: float = Field(ge=0.0, le=100.0)
    cash_pct: float = Field(ge=0.0, le=100.0)
    safe_pct: float = Field(ge=0.0, le=100.0)


class SectorTilt(BaseModel):
    """섹터 기울임 제안(강제 아님). 비율 필드 없음 — 방향만."""

    sector: str
    direction: Literal["overweight", "neutral", "underweight"]  # free
    rationale: str = Field(json_schema_extra=_pro())  # pro 상세


class ConstraintNote(BaseModel):
    """[PRO] 제약 적용 내역."""

    model_config = ConfigDict(json_schema_extra={"tier": "pro"})

    name: str
    applied: bool
    message: str


class ConstraintCheck(BaseModel):
    """validate_single_position 반환. '매도 명령' 아님."""

    limit_pct: float = 15.0
    weight_pct: float
    violated: bool
    message: str


class AllocationRequest(BaseModel):
    """입문자 입력 바디."""

    risk_tolerance: RiskToleranceLabel
    horizon: InvestmentHorizon
    reflect_current_regime: bool = True
    tier: Tier = Tier.FREE


class AllocationConclusion(BaseModel):
    """[FREE] 무료 노출 배분 결론."""

    mix: AssetMix
    headline: str  # '현재 국면에서는 방어적 비중을 고려할 근거가 많습니다'
    risk_label_text: str  # 5단계 감정 라벨의 한국어 문구
    sector_tilts_summary: list[str] = Field(default_factory=list)  # 방향만


class AllocationEvidence(BaseModel):
    """[PRO] 상세 근거."""

    model_config = ConfigDict(json_schema_extra={"tier": "pro"})

    regime_reasons: list[str] = Field(default_factory=list)
    korea_signals: list[str] = Field(default_factory=list)
    constraint_notes: list[ConstraintNote] = Field(default_factory=list)
    base_matrix_cell: str = ""  # 'moderate × mid'
    sector_tilts: list[SectorTilt] = Field(default_factory=list)


class AllocationResult(BaseModel):
    """최상위 allocation 응답."""

    conclusion: AllocationConclusion
    evidence: AllocationEvidence | EvidenceLocked | None = None
    confidence: Literal["low", "moderate", "high"] = "moderate"
    disclaimer: str  # 필수
    tier: Tier = Tier.FREE
    generated_at: datetime = Field(default_factory=now_utc)


# ── 라우팅/공통 응답 ────────────────────────────────────────────────────────


class HealthResponse(BaseModel):
    """라이브니스 — 투자응답 아님, disclaimer 없음."""

    status: Literal["ok", "degraded"] = "ok"
    version: str
    server_time: datetime = Field(default_factory=now_utc)
    cache_warm: bool = False


class ResponseMeta(BaseModel):
    tier: Tier
    cached: bool = False
    cache_age_seconds: int | None = None
    generated_at: datetime = Field(default_factory=now_utc)


class CompanyFundamentals(BaseModel):
    """기업 식별자 + 재무 지표(/lab 블록 입력). source 로 실데이터/폴백을 가시화.

    재무 필드는 snake_case(백엔드 관례). 프론트는 fetch 시 camelCase 로 매핑한다.
    roe 는 None 가능(데이터 미수집 정직 표기). 시세 지표(per/pbr/배당)는 yfinance,
    한국 펀더멘털은 DART, 실패 시 mock 폴백.
    """

    id: str  # ISIN
    name: str
    ticker: str
    yahoo: str
    exchange: str
    country: str
    aliases: list[str] = Field(default_factory=list)

    forward_per: float | None = None
    roe: float | None = None
    op_margin: float | None = None
    revenue_growth: float | None = None
    net_margin: float | None = None
    pbr: float | None = None
    debt_to_equity: float | None = None
    dividend_yield: float | None = None

    source: str = "mock"  # dart / yfinance / dart+yfinance / mock
    period: str = ""  # DART 재무 기준 분기(예: "2026 1분기"). 비-DART/실패 시 빈 문자열.
    asof: str = ""
    partial: bool = False


class CompanyDirectoryEntry(BaseModel):
    """검색 디렉토리 항목(식별자만, 재무 없음). 선택 시 별도로 펀더멘털 조회."""

    id: str
    name: str
    ticker: str
    exchange: str
    country: str


class ErrorDetail(BaseModel):
    code: str
    message: str
    request_id: str | None = None


class ErrorResponse(BaseModel):
    error: ErrorDetail
