"""snapshot_to_readings 의 metric 루프 변환 단위 테스트.

snapshot_to_readings(MarketSnapshot) -> dict[ticker -> IndicatorReading].
collector.py: status=='failed' 또는 latest is None 인 metric 은 제외(regime 가
결측을 정직하게 추적하도록), 나머지는 IndicatorReading 으로 매핑하며
is_stale=(status=='stale').

스코프 경계: foreign_flow 의 available=False 제외 / available=True+days 포함은
이미 test_foreign_flow.py 가 커버한다. 여기선 **metric 루프**(매핑/스킵/stale/
필드 패스스루/dict 키)와, 기존이 안 다룬 foreign_flow 의
'available=True 인데 consecutive_sell_days=None → 제외'(AND 둘째 조건)만 검증한다.

결정성: 합성 MarketSnapshot 만 사용(네트워크·시간 무관). asof 패스스루는
fetched_at 을 고정 datetime 으로 주입해 결정적으로 단언한다.
"""

from __future__ import annotations

from datetime import datetime, timezone

from app.data.collector import FOREIGN_FLOW_TICKER, snapshot_to_readings
from app.models import ForeignFlowReading, Layer, MarketSnapshot, TickerMetric

_DT = datetime(2026, 1, 1, tzinfo=timezone.utc)


def _metric(
    symbol: str = "^VIX",
    *,
    latest: float | None = 20.0,
    status: str = "ok",
    change_pct: float | None = 1.5,
    layer: Layer = Layer.GLOBAL_MACRO,
    source: str = "yfinance",
) -> TickerMetric:
    return TickerMetric(
        symbol=symbol,
        layer=layer,
        display_name=f"{symbol} 표시",
        latest=latest,
        change_pct=change_pct,
        status=status,  # type: ignore[arg-type]
        source=source,  # type: ignore[arg-type]
        fetched_at=_DT,
    )


def test_ok_metric_maps_all_fields():
    snap = MarketSnapshot(
        metrics=[_metric(symbol="^VIX", latest=20.0, change_pct=1.5, source="yfinance")]
    )
    readings = snapshot_to_readings(snap)
    assert set(readings) == {"^VIX"}
    r = readings["^VIX"]
    assert r.ticker == "^VIX"
    assert r.layer == Layer.GLOBAL_MACRO
    assert r.display_name == "^VIX 표시"
    assert r.value == 20.0
    assert r.change_pct == 1.5
    assert r.asof == _DT  # fetched_at 패스스루
    assert r.is_stale is False  # status ok
    assert r.source == "yfinance"


def test_failed_metric_is_skipped():
    # status=failed 면 latest 가 있어도 제외 — regime coverage 가 결측을 정직 반영.
    snap = MarketSnapshot(metrics=[_metric(symbol="^VIX", latest=20.0, status="failed")])
    assert snapshot_to_readings(snap) == {}


def test_metric_with_none_latest_is_skipped():
    # status 가 ok 여도 latest 없으면 제외.
    snap = MarketSnapshot(metrics=[_metric(symbol="^VIX", latest=None, status="ok")])
    assert snapshot_to_readings(snap) == {}


def test_stale_metric_sets_is_stale():
    snap = MarketSnapshot(metrics=[_metric(symbol="DX-Y.NYB", latest=105.0, status="stale")])
    readings = snapshot_to_readings(snap)
    assert "DX-Y.NYB" in readings
    assert readings["DX-Y.NYB"].is_stale is True
    assert readings["DX-Y.NYB"].value == 105.0


def test_empty_snapshot_yields_empty_readings():
    # metric 없음 + 기본 foreign_flow(available=False) → 빈 dict.
    assert snapshot_to_readings(MarketSnapshot()) == {}


def test_mixed_metrics_only_usable_survive():
    # ok·stale 만 살아남고 failed·latest-None 은 제외, dict 키는 symbol.
    snap = MarketSnapshot(
        metrics=[
            _metric(symbol="OK", latest=1.0, status="ok"),
            _metric(symbol="FAIL", latest=2.0, status="failed"),
            _metric(symbol="NONE", latest=None, status="ok"),
            _metric(symbol="STALE", latest=3.0, status="stale"),
        ]
    )
    readings = snapshot_to_readings(snap)
    assert set(readings) == {"OK", "STALE"}
    assert readings["OK"].is_stale is False
    assert readings["STALE"].is_stale is True


def test_foreign_flow_available_but_no_sell_days_excluded():
    # available=True 라도 consecutive_sell_days 가 None 이면 제외 — AND 의 둘째 조건.
    # (기존 test_foreign_flow 는 available=False / available=True+days=10 만 커버.)
    snap = MarketSnapshot(
        foreign_flow=ForeignFlowReading(available=True, consecutive_sell_days=None)
    )
    assert FOREIGN_FLOW_TICKER not in snapshot_to_readings(snap)
