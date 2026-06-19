"""중앙 설정 — 모든 임계값/가중치/컷오프/캐시TTL/CORS 의 단일 출처.

하드코딩 금지 원칙: 매직넘버는 전부 여기로 모은다.
환경변수로 오버라이드 가능(pydantic-settings).
"""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import AliasChoices, BaseModel, Field
from pydantic_settings import BaseSettings, SettingsConfigDict

from app.tickers import Layer

# ── 표시 텍스트 상수 (철학1·5: '매도' 금지, 근거 제시 톤) ──────────────────

DEFAULT_DISCLAIMER = (
    "본 정보는 투자 판단의 참고 근거이며 매수·매도 권유가 아닙니다. "
    "최종 판단과 책임은 투자자 본인에게 있습니다."
)


# ── 지표 규칙 (regime 엔진이 [-1,+1] 정규화에 사용) ─────────────────────────


class IndicatorRule(BaseModel):
    """지표별 임계값·방향·가중치 규칙. config 소속(free/pro 무관).

    direction:
        higher_is_risk_off — 값↑ = 리스크오프 압력 (예: VIX, 원달러, DXY).
        higher_is_risk_on  — 값↑ = 리스크온 (예: 코스피 모멘텀).
    metric:
        level — value(레벨)를 임계값과 비교.
        momentum — change_pct(전일대비)를 임계값과 비교.
    임계값 의미는 direction 에 따라 calm/danger 가 큰값/작은값으로 갈린다.
    선형 보간: calm_threshold ↔ danger_threshold 사이를 [-1,+1] 로.
    """

    ticker: str
    layer: Layer
    display_name: str
    direction: Literal["higher_is_risk_off", "higher_is_risk_on"]
    metric: Literal["level", "momentum"] = "level"
    calm_threshold: float | None = None  # 이 값이면 +1 (안정)
    warn_threshold: float | None = None  # 주의 경계(코멘트용)
    danger_threshold: float | None = None  # 이 값이면 -1 (위험)
    weight: float = 1.0


class RegimeConfig(BaseModel):
    """regime 엔진 주입용 묶음. 컷오프/레이어가중/지표규칙."""

    cutoff_risk_on: float = 25.0  # score>=+25 → 리스크온
    cutoff_risk_off: float = -25.0  # score<=-25 → 리스크오프
    min_coverage: float = 0.5  # 데이터 커버리지 미만이면 중립+저신뢰 강제
    # 레이어 가중치 — L2(한국매크로) 최고 (철학7).
    layer_weights: dict[str, float] = Field(
        default_factory=lambda: {
            Layer.GLOBAL_MACRO.value: 1.0,
            Layer.KR_MACRO.value: 1.6,
            Layer.RISK_COMMODITY.value: 0.8,
            Layer.SECTOR_STOCK.value: 0.6,
        }
    )
    indicator_rules: dict[str, IndicatorRule] = Field(default_factory=dict)


def _default_indicator_rules() -> dict[str, IndicatorRule]:
    """16티커 중 임계값이 명확한 핵심 지표의 규칙. 나머지는 모멘텀 기반."""
    L = Layer
    rules = [
        IndicatorRule(
            ticker="^VIX", layer=L.GLOBAL_MACRO, display_name="변동성지수(VIX)",
            direction="higher_is_risk_off", metric="level",
            calm_threshold=15.0, warn_threshold=20.0, danger_threshold=25.0,
            weight=1.2,
        ),
        IndicatorRule(
            ticker="DX-Y.NYB", layer=L.GLOBAL_MACRO, display_name="달러인덱스(DXY)",
            direction="higher_is_risk_off", metric="level",
            calm_threshold=100.0, warn_threshold=105.0, danger_threshold=110.0,
            weight=0.9,
        ),
        IndicatorRule(
            ticker="^TNX", layer=L.GLOBAL_MACRO, display_name="미 10년물 금리",
            direction="higher_is_risk_off", metric="momentum",
            calm_threshold=-2.0, danger_threshold=3.0, weight=0.7,
        ),
        IndicatorRule(
            ticker="KRW=X", layer=L.KR_MACRO, display_name="원달러 환율",
            direction="higher_is_risk_off", metric="level",
            calm_threshold=1300.0, warn_threshold=1400.0, danger_threshold=1500.0,
            weight=1.6,
        ),
        IndicatorRule(
            ticker="^KS11", layer=L.KR_MACRO, display_name="코스피",
            direction="higher_is_risk_on", metric="momentum",
            calm_threshold=2.0, danger_threshold=-3.0, weight=1.4,
        ),
        IndicatorRule(
            ticker="^KQ11", layer=L.KR_MACRO, display_name="코스닥",
            direction="higher_is_risk_on", metric="momentum",
            calm_threshold=2.0, danger_threshold=-3.0, weight=1.0,
        ),
        IndicatorRule(
            ticker="^GSPC", layer=L.RISK_COMMODITY, display_name="S&P500",
            direction="higher_is_risk_on", metric="momentum",
            calm_threshold=1.5, danger_threshold=-2.5, weight=0.8,
        ),
        IndicatorRule(
            ticker="^IXIC", layer=L.RISK_COMMODITY, display_name="나스닥",
            direction="higher_is_risk_on", metric="momentum",
            calm_threshold=1.5, danger_threshold=-3.0, weight=0.7,
        ),
        IndicatorRule(
            ticker="BTC-USD", layer=L.RISK_COMMODITY, display_name="비트코인",
            direction="higher_is_risk_on", metric="momentum",
            calm_threshold=3.0, danger_threshold=-5.0, weight=0.4,
        ),
    ]
    return {r.ticker: r for r in rules}


# ── 자산배분 설정 ───────────────────────────────────────────────────────────


class SectorTiltRule(BaseModel):
    sector: str
    direction: Literal["overweight", "neutral", "underweight"]
    rationale: str


class AllocationConfig(BaseModel):
    """자산배분 엔진 주입용. 매트릭스/제약/틸트/라벨 텍스트."""

    min_cash_pct: float = 20.0  # 현금 최소
    max_single_position_pct: float = 15.0  # 단일 종목 최대(기업분석 레이어가 강제)

    # 리스크 허용도 5단계의 한국어 감정 문구 (철학4: 표준편차 금지).
    risk_label_text: dict[str, str] = Field(
        default_factory=lambda: {
            "very_conservative": "-10%만 빠져도 잠을 설칩니다 (원금 보존 최우선)",
            "conservative": "-20% 빠지면 마음이 많이 불편합니다 (안정 우선)",
            "moderate": "-30% 정도는 길게 보면 견딜 수 있습니다 (균형)",
            "aggressive": "-40%도 회복을 기다릴 수 있습니다 (성장 우선)",
            "very_aggressive": "반토막이 나도 흔들리지 않습니다 (수익 극대화)",
        }
    )

    # base_matrix[risk][horizon] = 기초 주식 비중(%). 나머지는 현금/안전자산 분배.
    base_stocks_matrix: dict[str, dict[str, float]] = Field(
        default_factory=lambda: {
            "very_conservative": {"short": 20.0, "mid": 25.0, "long": 30.0},
            "conservative": {"short": 30.0, "mid": 40.0, "long": 45.0},
            "moderate": {"short": 45.0, "mid": 55.0, "long": 60.0},
            "aggressive": {"short": 60.0, "mid": 70.0, "long": 75.0},
            "very_aggressive": {"short": 70.0, "mid": 78.0, "long": 80.0},
        }
    )

    # regime stance → 주식 비중 가감(%p). .get(stance, 0.0) 으로 KeyError 방지.
    regime_tilt: dict[str, float] = Field(
        default_factory=lambda: {
            "리스크온": 8.0,
            "중립": 0.0,
            "리스크오프": -12.0,
        }
    )

    # 한국 디리스킹 임계값(원달러/VIX/외국인) → 주식 비중 차감(%p).
    usdkrw_caution: float = 1400.0
    usdkrw_risk: float = 1500.0
    usdkrw_caution_derisk_pct: float = 5.0
    usdkrw_risk_derisk_pct: float = 10.0
    vix_risk: float = 25.0
    vix_derisk_pct: float = 5.0
    foreign_sell_streak: int = 10  # 외국인 연속 순매도일 경고
    foreign_derisk_pct: float = 5.0

    # 섹터 틸트 룰: stance → 제안 목록.
    sector_tilt_rules: dict[str, list[SectorTiltRule]] = Field(
        default_factory=lambda: {
            "리스크온": [
                SectorTiltRule(sector="반도체·기술", direction="overweight",
                               rationale="위험선호 국면에서 성장주 모멘텀이 우호적입니다."),
                SectorTiltRule(sector="방어·필수소비", direction="underweight",
                               rationale="상대적으로 방어주 매력은 낮아지는 구간입니다."),
            ],
            "리스크오프": [
                SectorTiltRule(sector="금·안전자산", direction="overweight",
                               rationale="위험회피 압력이 커질 때 헤지 자산이 부각됩니다."),
                SectorTiltRule(sector="방어·필수소비", direction="overweight",
                               rationale="변동성 확대 구간에서 방어주가 상대적으로 견조합니다."),
                SectorTiltRule(sector="반도체·기술", direction="underweight",
                               rationale="고변동 성장주는 부담이 커지는 구간입니다."),
            ],
            "중립": [],
        }
    )


# ── 최상위 Settings ─────────────────────────────────────────────────────────


class Settings(BaseSettings):
    """앱 전역 설정 싱글톤. 환경변수 오버라이드(THESIS_ prefix)."""

    model_config = SettingsConfigDict(
        env_prefix="THESIS_",
        env_nested_delimiter="__",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "THESIS Backend"
    version: str = "0.1.0"

    # ── Supabase 인증 (THESIS_ prefix 예외 — .env 의 bare 이름을 그대로 읽는다) ──
    # validation_alias 가 있으면 pydantic-settings 가 env_prefix 를 적용하지 않으므로
    # .env 의 SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY / SUPABASE_SECRET_KEY 를 직접 읽는다.
    # 미설정 시 토큰 검증/티어 조회가 비활성(익명 free)으로 안전 폴백된다.
    supabase_url: str = Field(
        default="",
        validation_alias=AliasChoices("SUPABASE_URL", "THESIS_SUPABASE_URL"),
    )
    supabase_publishable_key: str = Field(
        default="",
        validation_alias=AliasChoices(
            "SUPABASE_PUBLISHABLE_KEY", "THESIS_SUPABASE_PUBLISHABLE_KEY"
        ),
    )
    supabase_secret_key: str = Field(
        default="",
        validation_alias=AliasChoices(
            "SUPABASE_SECRET_KEY", "THESIS_SUPABASE_SECRET_KEY"
        ),
    )

    # ── Stripe 구독 (테스트/샌드박스). bare 이름을 .env 에서 직접 읽는다. ──
    # PG 무관 설계: webhook 이 profiles.tier 를 갱신할 뿐, 게이팅은 tier 한 곳만 본다.
    # 포트원(한국 PG) 도 동일하게 set_user_tier 만 호출하면 병렬로 붙는다.
    stripe_secret_key: str = Field(
        default="", validation_alias=AliasChoices("STRIPE_SECRET_KEY", "THESIS_STRIPE_SECRET_KEY")
    )
    stripe_publishable_key: str = Field(
        default="", validation_alias=AliasChoices("STRIPE_PUBLISHABLE_KEY", "THESIS_STRIPE_PUBLISHABLE_KEY")
    )
    stripe_webhook_secret: str = Field(
        default="", validation_alias=AliasChoices("STRIPE_WEBHOOK_SECRET", "THESIS_STRIPE_WEBHOOK_SECRET")
    )
    stripe_price_pro: str = Field(
        default="", validation_alias=AliasChoices("STRIPE_PRICE_PRO", "THESIS_STRIPE_PRICE_PRO")
    )
    billing_success_url: str = "http://localhost:3000/billing/success"
    billing_cancel_url: str = "http://localhost:3000/billing/cancel"

    # 캐시
    cache_ttl_seconds: int = 1800  # 30분
    collector_timeout_sec: float = 10.0
    fundamentals_cache_ttl_seconds: int = 1800  # 기업 재무 캐시(30분)

    # ── DART(전자공시) 한국 기업 재무 — bare 이름을 .env 에서 직접 읽는다 ──
    # 무료 키 발급: https://opendart.fss.or.kr (인증키 신청/관리). 미설정 시 한국 종목은
    # yfinance/mock 폴백(가짜 숫자 금지). corpCode 매핑은 .cache 에 1회 다운로드 후 재사용.
    dart_api_key: str = Field(
        default="",
        validation_alias=AliasChoices("DART_API_KEY", "THESIS_DART_API_KEY"),
    )

    # SEC EDGAR(미국 상장사 디렉토리) — 검색용. company_tickers.json 1회 다운로드·캐시.
    # SEC 는 User-Agent 헤더를 요구한다(없으면 차단). 형식 "이름 이메일", 키는 불필요·무료.
    # https://www.sec.gov/os/webmaster-faq#developers
    sec_user_agent: str = Field(
        default="Thesis Investing MVP admin@thesis.local",
        validation_alias=AliasChoices("SEC_USER_AGENT", "THESIS_SEC_USER_AGENT"),
    )

    # 외국인 순매수(pykrx 옵셔널 어댑터) — 일1회 파일캐시.
    # KRX 익명 API 차단 확인됨(2026-06): KRX 회원계정 환경변수 KRX_ID/KRX_PW 가
    # 있어야만 실데이터 조회 가능. 미설정/실패 시 정직하게 stub(available=False) 폴백.
    foreign_flow_market: str = "KOSPI"
    foreign_flow_lookback_days: int = 15  # 영업일 환산 여유 포함 조회 범위(달력일)
    foreign_flow_cache_dir: str = ".cache"
    foreign_flow_enabled: bool = True  # False 면 호출 자체 생략(영구 stub)

    # CORS (프론트: Next.js 로컬 + Vercel)
    cors_origins: list[str] = Field(
        default_factory=lambda: ["http://localhost:3000"]
    )

    # 임계값(개별 노출용 — 엔진은 regime/allocation config 사용)
    vix_risk: float = 25.0
    vix_calm: float = 15.0
    dxy_watch: float = 105.0
    usdkrw_caution: float = 1400.0
    usdkrw_risk: float = 1500.0
    foreign_sell_streak: int = 10
    max_single_position_pct: float = 15.0
    min_cash_pct: float = 20.0
    peg_max: float = 1.0
    roe_min: float = 15.0
    op_margin_min: float = 20.0

    disclaimer: str = DEFAULT_DISCLAIMER

    # 하위 엔진 설정
    regime: RegimeConfig = Field(default_factory=RegimeConfig)
    allocation: AllocationConfig = Field(default_factory=AllocationConfig)

    def model_post_init(self, __context: object) -> None:
        # 지표 규칙은 default_factory 로 미리 못 넣으므로 사후 주입.
        if not self.regime.indicator_rules:
            self.regime.indicator_rules = _default_indicator_rules()


@lru_cache
def get_settings() -> Settings:
    """프로세스 단일 Settings. FastAPI Depends 로 주입."""
    return Settings()


settings = get_settings()
