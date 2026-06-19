"""yfinance 수집기 — 16티커를 표준 지표 모델로 변환.

설계 계약(철학 강제):
- 동기 함수다(yfinance 가 동기). 라우터에서 run_in_threadpool 로 감싼다.
- 부분 실패 허용: 한 티커가 죽어도 나머지는 산다(failed_symbols 로 가시화).
- in-memory TTL(30분) 캐시. Redis 는 인터페이스(CacheBackend Protocol)만 열어둔다.
- 외국인 순매수는 yfinance 로 직접 못 가져온다 → ForeignFlowStub(available=False).
  가짜 숫자를 절대 만들지 않는다(철학7 정직성).
- free/pro 게이팅은 모델(models.py)에서 이미 필드 메타로 강제됨. 수집기는 원시값을
  채우기만 하고, free_visible 플래그만 spec 에서 옮긴다.

캐시 키는 (use_cache 가 True 일 때) only_layers 조합별로 분리한다. stale 폴백:
네트워크 전면 실패 시 만료된 캐시라도 cache_status='stale' 로 내려준다(가용성 우선).
"""

from __future__ import annotations

import threading
import time
from typing import Protocol, runtime_checkable

from app.config import settings
from app.data.foreign_flow import fetch_foreign_flow
from app.models import (
    ForeignFlowReading,
    IndicatorReading,
    MarketSnapshot,
    TickerMetric,
    TrendInfo,
    now_utc,
)
from app.tickers import Layer, TickerSpec, specs_for_layers

# yfinance 는 import 시점에 무거운 의존성을 끌어오므로, import 실패가
# 전체 앱을 죽이지 않도록 방어한다(테스트/오프라인 환경 견고성).
try:
    import yfinance as _yf
except Exception:  # pragma: no cover - 환경 의존
    _yf = None


# ── 캐시 인터페이스 ──────────────────────────────────────────────────────────


@runtime_checkable
class CacheBackend(Protocol):
    """캐시 추상화. InMemoryTTLCache 가 기본 구현, Redis 는 동일 시그니처로 교체 가능."""

    def get(self, key: str) -> MarketSnapshot | None: ...
    def set(self, key: str, value: MarketSnapshot, ttl_sec: int) -> None: ...
    def get_stale(self, key: str) -> MarketSnapshot | None: ...


class InMemoryTTLCache:
    """프로세스 메모리 TTL 캐시. 스레드 안전(락) — threadpool 동시 접근 대비.

    get() 은 만료 시 None. get_stale() 은 만료돼도 마지막 값을 돌려준다
    (네트워크 전면 실패 시 가용성 폴백용).
    """

    def __init__(self, default_ttl_sec: int = settings.cache_ttl_seconds) -> None:
        self._default_ttl_sec = default_ttl_sec
        self._lock = threading.Lock()
        # key -> (expires_at_monotonic, snapshot)
        self._store: dict[str, tuple[float, MarketSnapshot]] = {}

    def get(self, key: str) -> MarketSnapshot | None:
        with self._lock:
            entry = self._store.get(key)
            if entry is None:
                return None
            expires_at, snapshot = entry
            if time.monotonic() >= expires_at:
                return None
            return snapshot

    def set(self, key: str, value: MarketSnapshot, ttl_sec: int | None = None) -> None:
        ttl = self._default_ttl_sec if ttl_sec is None else ttl_sec
        with self._lock:
            self._store[key] = (time.monotonic() + ttl, value)

    def get_stale(self, key: str) -> MarketSnapshot | None:
        with self._lock:
            entry = self._store.get(key)
            return None if entry is None else entry[1]


# 프로세스 단일 캐시 싱글톤(deps.get_collector 가 이걸 주입).
_default_cache = InMemoryTTLCache()


# ── 추세 계산 ────────────────────────────────────────────────────────────────


def compute_trend(closes: list[float], short: int = 5, long: int = 20) -> TrendInfo:
    """단·장기 단순이동평균으로 추세 라벨 산출.

    데이터가 long 개 미만이면 'insufficient_data'. 라벨 임계(±0.5%)는
    노이즈로 인한 라벨 깜빡임을 줄이기 위한 중립 밴드.
    """
    clean = [c for c in closes if c is not None]
    if len(clean) < long:
        return TrendInfo(label="insufficient_data")

    sma_short = sum(clean[-short:]) / short
    sma_long = sum(clean[-long:]) / long

    if sma_long == 0:
        return TrendInfo(label="sideways", sma5=sma_short, sma20=sma_long)

    spread_pct = (sma_short - sma_long) / abs(sma_long) * 100.0
    if spread_pct > 0.5:
        label = "uptrend"
    elif spread_pct < -0.5:
        label = "downtrend"
    else:
        label = "sideways"
    return TrendInfo(label=label, sma5=sma_short, sma20=sma_long)


# ── 단일 티커 수집 ───────────────────────────────────────────────────────────


def _extract_closes(spec: TickerSpec, period: str, interval: str, timeout_sec: float) -> list[float]:
    """yfinance 종가 시계열 추출. 실패 시 예외를 위로 던진다(호출자가 잡음)."""
    if _yf is None:
        raise RuntimeError("yfinance unavailable")

    ticker = _yf.Ticker(spec.symbol)
    hist = ticker.history(period=period, interval=interval, timeout=timeout_sec)
    if hist is None or hist.empty or "Close" not in hist.columns:
        raise ValueError("empty history")

    closes = [float(v) for v in hist["Close"].tolist() if v == v]  # NaN 제거(v==v)
    if not closes:
        raise ValueError("no valid closes")
    return closes


def collect_one(
    spec: TickerSpec,
    *,
    period: str = "2mo",
    interval: str = "1d",
    timeout_sec: float = settings.collector_timeout_sec,
) -> TickerMetric:
    """단일 티커를 TickerMetric 으로. 절대 예외를 던지지 않는다 — 실패는 status='failed'.

    부분 실패 허용(철학: 견고성)을 보장하기 위해, 네트워크/파싱 오류를
    여기서 흡수해 status/error 필드로 표면화한다.
    """
    base = TickerMetric(
        symbol=spec.symbol,
        layer=spec.layer,
        display_name=spec.display_name,
        free_visible=spec.free_visible,
    )
    try:
        closes = _extract_closes(spec, period, interval, timeout_sec)
    except Exception as exc:  # 부분 실패 흡수
        base.status = "failed"
        base.error = f"{type(exc).__name__}: {exc}"
        return base

    latest = closes[-1]
    prev_close = closes[-2] if len(closes) >= 2 else None
    change_pct = None
    if prev_close is not None and prev_close != 0:
        change_pct = (latest - prev_close) / abs(prev_close) * 100.0

    base.latest = latest
    base.prev_close = prev_close
    base.change_pct = round(change_pct, 4) if change_pct is not None else None
    base.trend = compute_trend(closes)
    base.status = "ok"
    return base


# ── 외국인 수급(실데이터 우선 + 정직한 stub 폴백) ────────────────────────────

# 외국인 순매수 신호의 합성 티커(snapshot_to_readings → regime 노출용).
FOREIGN_FLOW_TICKER = "FOREIGN_NET"


def get_foreign_flow_stub() -> ForeignFlowReading:
    """외국인 순매수 관측치. (이름은 라우트/스냅샷 호환을 위해 유지.)

    실데이터 우선: KRX 회원계정(KRX_ID/KRX_PW)이 있으면 pykrx 로 실데이터를
    가져온다(일1회 파일캐시). 자격증명 미설정/import실패/빈응답이면 가짜 숫자를
    만들지 않고 available=False 스텁으로 graceful degrade(철학7 정직성).

    동기·차단 호출이지만 일1회 캐시로 호출 빈도가 최소화된다. 어떤 예외도 위로
    던지지 않는다 — 부분 실패를 흡수해 항상 ForeignFlowReading 을 반환한다.
    """
    try:
        return fetch_foreign_flow()
    except Exception:  # pragma: no cover - 방어적 폴백
        return ForeignFlowReading(
            available=False,
            source="stub",
            market=settings.foreign_flow_market,
            note="외국인 순매수 조회 중 예외 — 데이터 미수집(stub 폴백)",
        )


# ── 전체 수집 ────────────────────────────────────────────────────────────────


def _cache_key(only_layers: list[Layer] | None) -> str:
    if not only_layers:
        return "snapshot:all"
    layers = ",".join(sorted(l.value for l in set(only_layers)))
    return f"snapshot:{layers}"


def _build_snapshot(specs: list[TickerSpec]) -> MarketSnapshot:
    metrics: list[TickerMetric] = []
    failed: list[str] = []
    for spec in specs:
        metric = collect_one(spec)
        metrics.append(metric)
        if metric.status == "failed":
            failed.append(spec.symbol)

    # Top-Down 표시 순서 강제: 레이어 오름차순(L1<L2<L3<L4), 내부는 원래 순서 유지.
    metrics.sort(key=lambda m: m.layer.value)

    return MarketSnapshot(
        generated_at=now_utc(),
        cache_status="fresh",
        metrics=metrics,
        foreign_flow=get_foreign_flow_stub(),
        failed_symbols=failed,
        partial=bool(failed) and len(failed) < len(specs),
        disclaimer=settings.disclaimer,
    )


def collect_all(
    *,
    use_cache: bool = True,
    only_layers: list[Layer] | None = None,
    cache: CacheBackend | None = None,
) -> MarketSnapshot:
    """16티커(또는 only_layers) 수집 → MarketSnapshot.

    캐시 흐름:
      1) use_cache 면 fresh 캐시 히트 시 cache_status='cached' 로 반환.
      2) 미스면 신규 수집. 전면 실패(전 티커 fail)면 stale 캐시 폴백 시도.
      3) 정상 수집은 캐시에 저장.
    """
    backend = cache if cache is not None else _default_cache
    key = _cache_key(only_layers)

    if use_cache:
        hit = backend.get(key)
        if hit is not None:
            return hit.model_copy(update={"cache_status": "cached"})

    specs = specs_for_layers(only_layers)
    snapshot = _build_snapshot(specs)

    all_failed = len(snapshot.failed_symbols) == len(specs) and len(specs) > 0
    if all_failed:
        stale = backend.get_stale(key)
        if stale is not None:
            return stale.model_copy(update={"cache_status": "stale"})
        # 폴백조차 없으면 실패 스냅샷을 그대로(빈 캐시는 저장 안 함).
        return snapshot

    if use_cache:
        backend.set(key, snapshot, settings.cache_ttl_seconds)
    return snapshot


# ── collector → regime 어댑터 ────────────────────────────────────────────────


def snapshot_to_readings(snapshot: MarketSnapshot) -> dict[str, IndicatorReading]:
    """MarketSnapshot 을 regime 엔진 입력 dict[ticker -> IndicatorReading] 로 변환.

    실패(status='failed')한 티커는 제외한다 → regime 의 coverage 추적이
    결측을 정직하게 반영(가중치 재정규화)할 수 있게 한다.
    level 형/momentum 형 구분은 규칙(config) 책임이므로 여기선 value/change_pct
    둘 다 채워 보낸다.
    """
    readings: dict[str, IndicatorReading] = {}
    for m in snapshot.metrics:
        if m.status == "failed" or m.latest is None:
            continue
        readings[m.symbol] = IndicatorReading(
            ticker=m.symbol,
            layer=m.layer,
            display_name=m.display_name,
            value=m.latest,
            change_pct=m.change_pct,
            asof=m.fetched_at,
            is_stale=(m.status == "stale"),
            source=m.source,
        )

    # 외국인 순매수: 실데이터로 수집됐을 때만 정직하게 노출(미수집이면 제외).
    # value = 외국인 연속 순매도일(레벨형), change_pct = 최신 순매수(억원).
    ff = snapshot.foreign_flow
    if ff.available and ff.consecutive_sell_days is not None:
        readings[FOREIGN_FLOW_TICKER] = IndicatorReading(
            ticker=FOREIGN_FLOW_TICKER,
            layer=Layer.KR_MACRO,
            display_name="외국인 연속 순매도일",
            value=float(ff.consecutive_sell_days),
            change_pct=ff.net_buy_latest_krw_eok,
            asof=ff.asof,
            is_stale=False,
            source="pykrx",
        )
    return readings
