"""API 라우터 — Top-Down 순서(매크로→자산배분→기업분석)를 엔드포인트로 노출.

엔드포인트:
    GET  /api/health      라이브니스(투자응답 아님, disclaimer 없음).
    GET  /api/regime      시장 국면 결론(free) + 근거(pro 게이팅).
    POST /api/allocation  자산배분 제안(regime 반영).
    GET  /api/indicators  16티커 스냅샷(레이어 필터 가능).

철학 강제:
- collector(yfinance)는 동기 함수 → run_in_threadpool 로 감싸 이벤트루프 비차단.
- regime/allocation 응답의 disclaimer 는 누락 불가(엔진이 채우지만 라우터가 최종 보장).
- tier 게이팅은 쿼리 파라미터로만(MVP, 인증 경계 없음 — deps 에 후속 삽입점).
- 어떤 에러도 '매도/위험확정' 단정 없이 ErrorResponse 표준 형태로 반환.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import JSONResponse

from app.config import settings
from app.deps import get_collector, get_user_tier
from app.models import (
    AllocationRequest,
    AllocationResult,
    CompanyDirectoryEntry,
    CompanyFundamentals,
    ErrorDetail,
    ErrorResponse,
    HealthResponse,
    Layer,
    MarketSnapshot,
    RegimeResult,
    Tier,
)

# collector / regime / allocation 은 계약상 모듈 레벨 함수(동기).
from app.data.collector import (
    InMemoryTTLCache,
    collect_all,
    snapshot_to_readings,
)
from app.data.fundamentals import collect_companies, fetch_company, search_directory
from app.engine.regime import classify_regime
from app.engine.allocation import compute_allocation

router = APIRouter(prefix="/api", tags=["thesis"])


def _error_response(status_code: int, code: str, message: str) -> JSONResponse:
    """ErrorResponse 스키마 기반 표준 에러. 단정 문구 금지."""
    payload = ErrorResponse(error=ErrorDetail(code=code, message=message))
    return JSONResponse(status_code=status_code, content=payload.model_dump(mode="json"))


async def _snapshot(
    cache: InMemoryTTLCache,
    *,
    only_layers: list[Layer] | None = None,
) -> MarketSnapshot:
    """동기 collector 를 threadpool 로 호출해 스냅샷 확보(캐시 우선)."""
    return await run_in_threadpool(
        collect_all, use_cache=True, only_layers=only_layers, cache=cache
    )


@router.get("/health", response_model=HealthResponse)
async def health(cache: InMemoryTTLCache = Depends(get_collector)) -> HealthResponse:
    """라이브니스. 캐시 워밍 여부만 부수적으로 노출."""
    warm = False
    try:
        warm = cache.get_stale("snapshot:all") is not None
    except Exception:
        warm = False
    return HealthResponse(status="ok", version=settings.version, cache_warm=warm)


@router.get(
    "/regime",
    response_model=RegimeResult,
    responses={502: {"model": ErrorResponse}},
)
async def get_regime(
    tier: Tier = Depends(get_user_tier),
    cache: InMemoryTTLCache = Depends(get_collector),
) -> RegimeResult | JSONResponse:
    """시장 국면: conclusion(무료) + evidence(pro 게이팅) + 확률적 confidence."""
    try:
        snapshot = await _snapshot(cache)
        readings = snapshot_to_readings(snapshot)
        result = await run_in_threadpool(
            classify_regime, readings, settings.regime, tier
        )
    except Exception as exc:  # noqa: BLE001 — 외부데이터 의존, 부분실패 가시화
        return _error_response(
            502, "regime_unavailable",
            f"시장 데이터 분석을 일시적으로 제공할 수 없습니다: {exc}",
        )
    if not result.disclaimer:
        result.disclaimer = settings.disclaimer
    # 데이터 신선도(stale 폴백 여부)를 결론과 함께 전달 — 프론트가 갱신 지연 고지(철학5).
    result.cache_status = snapshot.cache_status
    return result


@router.post(
    "/allocation",
    response_model=AllocationResult,
    responses={502: {"model": ErrorResponse}},
)
async def post_allocation(
    body: AllocationRequest,
    tier: Tier = Depends(get_user_tier),
    cache: InMemoryTTLCache = Depends(get_collector),
) -> AllocationResult | JSONResponse:
    """자산배분 제안: 현재 국면을 반영해 mix/근거/제약을 산출."""
    # tier 는 검증된 profile 에서만 도출 — body 의 어떤 tier 값도 신뢰하지 않는다.
    body.tier = tier
    try:
        snapshot = await _snapshot(cache)
        readings = snapshot_to_readings(snapshot)
        regime = await run_in_threadpool(
            classify_regime, readings, settings.regime, tier
        )
        result = await run_in_threadpool(
            compute_allocation, body, regime, settings.allocation
        )
    except Exception as exc:  # noqa: BLE001
        return _error_response(
            502, "allocation_unavailable",
            f"자산배분 근거를 일시적으로 산출할 수 없습니다: {exc}",
        )
    if not result.disclaimer:
        result.disclaimer = settings.disclaimer
    return result


# TickerMetric 의 _pro 태그 원시수치 필드 — free/익명에는 마스킹(None)한다.
# (models.py 의 json_schema_extra=_pro 메타와 일치. trend.sma5/sma20 도 _pro.)
_PRO_METRIC_FIELDS = ("latest", "prev_close", "error")
_PRO_TREND_FIELDS = ("sma5", "sma20")


def _mask_snapshot_for_free(snapshot: MarketSnapshot) -> MarketSnapshot:
    """free/익명 응답에서 _pro 태그 원시수치를 None 으로 마스킹.

    change_pct/status/추세 라벨 등 _free 필드는 유지한다(결론·요약은 무료).
    외국인 series(pro 근거)도 마스킹한다.
    """
    masked = snapshot.model_copy(deep=True)
    for metric in masked.metrics:
        for f in _PRO_METRIC_FIELDS:
            setattr(metric, f, None)
        for f in _PRO_TREND_FIELDS:
            setattr(metric.trend, f, None)
    if masked.foreign_flow is not None:
        masked.foreign_flow.series = None
    return masked


@router.get(
    "/companies",
    response_model=list[CompanyFundamentals],
    responses={502: {"model": ErrorResponse}},
)
async def get_companies() -> list[CompanyFundamentals] | JSONResponse:
    """조립 분석(/lab) 기업 재무 — 한국=DART, 미국·시세=yfinance, 실패 시 mock 폴백.

    원시 재무값(블록 입력)이라 tier 게이팅 없음 — Pro 경계는 프론트의 분석 블록 단위로 적용.
    """
    try:
        return await run_in_threadpool(collect_companies, use_cache=True)
    except Exception as exc:  # noqa: BLE001 — 외부데이터 의존, 부분실패 가시화
        return _error_response(
            502, "companies_unavailable",
            f"기업 재무 데이터를 일시적으로 제공할 수 없습니다: {exc}",
        )


@router.get(
    "/companies/search",
    response_model=list[CompanyDirectoryEntry],
    responses={502: {"model": ErrorResponse}},
)
async def search_companies(
    q: str = Query("", description="검색어(기업명/종목코드/티커)"),
    limit: int = Query(30, ge=1, le=50),
) -> list[CompanyDirectoryEntry] | JSONResponse:
    """기업 검색 디렉토리 — 한국=DART 전 상장사, 미국=주요 종목. 식별자만(재무 없음)."""
    try:
        rows = await run_in_threadpool(search_directory, q, limit)
        return [CompanyDirectoryEntry(**r) for r in rows]
    except Exception as exc:  # noqa: BLE001
        return _error_response(
            502, "search_unavailable",
            f"기업 검색을 일시적으로 제공할 수 없습니다: {exc}",
        )


@router.get(
    "/company",
    response_model=CompanyFundamentals,
    responses={404: {"model": ErrorResponse}, 502: {"model": ErrorResponse}},
)
async def get_company(
    id: str = Query(..., description="회사 id(ISIN/한국 종목코드/미국 티커)"),
) -> CompanyFundamentals | JSONResponse:
    """단일 종목 펀더멘털 온디맨드 조회(검색 결과 선택 시)."""
    try:
        result = await run_in_threadpool(fetch_company, id)
    except Exception as exc:  # noqa: BLE001
        return _error_response(
            502, "company_unavailable",
            f"기업 재무를 일시적으로 제공할 수 없습니다: {exc}",
        )
    if result is None:
        return _error_response(404, "company_not_found", "해당 종목을 찾을 수 없습니다.")
    return result


@router.get(
    "/indicators",
    response_model=MarketSnapshot,
    responses={502: {"model": ErrorResponse}},
)
async def get_indicators(
    tier: Tier = Depends(get_user_tier),
    layer: Layer | None = Query(None, description="특정 레이어만 필터"),
    cache: InMemoryTTLCache = Depends(get_collector),
) -> MarketSnapshot | JSONResponse:
    """16티커 스냅샷. 레이어 필터 가능. 부분 실패는 partial/failed_symbols 로 가시화.

    free/익명: 요약(change_pct·추세 라벨·status)만. pro: 원시 수치(latest/sma 등)까지.
    """
    only = [layer] if layer is not None else None
    try:
        snapshot = await _snapshot(cache, only_layers=only)
    except Exception as exc:  # noqa: BLE001
        return _error_response(
            502, "indicators_unavailable",
            f"시장 지표를 일시적으로 수집할 수 없습니다: {exc}",
        )
    if not snapshot.disclaimer:
        snapshot.disclaimer = settings.disclaimer
    if tier != Tier.PRO:
        snapshot = _mask_snapshot_for_free(snapshot)
    return snapshot
