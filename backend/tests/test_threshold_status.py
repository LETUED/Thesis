"""BE1 임계값 상태(threshold_status) 회귀 테스트.

검증 범위:
- thresholds.classify_threshold 가 regime 의 기존 분류와 동일 결과.
- Free 마스킹 후에도 threshold_status 는 살아있고(결론 신호), 원시 level(latest/
  prev_close)·error 는 None 으로 마스킹됨.
- 임계값 규칙이 없는 티커는 threshold_status 가 None.

네트워크 없이 실행되도록 합성 TickerMetric 으로만 검증한다.
"""

from __future__ import annotations

from app.api.routes import _mask_snapshot_for_free
from app.config import IndicatorRule, settings
from app.data.collector import classify_threshold as _ct_in_collector
from app.engine.thresholds import classify_threshold
from app.models import MarketSnapshot, TickerMetric, TrendInfo
from app.tickers import Layer


def _vix_rule() -> IndicatorRule:
    return settings.regime.indicator_rules["^VIX"]


# ── classify_threshold 정확성 ────────────────────────────────────────────────


def test_classify_threshold_higher_is_risk_off():
    rule = _vix_rule()  # calm 15 / warn 20 / danger 25, higher_is_risk_off
    assert classify_threshold(30.0, rule) == "danger"
    assert classify_threshold(22.0, rule) == "warn"
    assert classify_threshold(12.0, rule) == "calm"
    assert classify_threshold(17.0, rule) == "neutral"


def test_classify_threshold_higher_is_risk_on():
    rule = settings.regime.indicator_rules["^KS11"]  # momentum, higher_is_risk_on
    assert classify_threshold(-5.0, rule) == "danger"
    assert classify_threshold(3.0, rule) == "calm"
    assert classify_threshold(0.0, rule) == "neutral"


def test_collector_reexports_same_classifier():
    # collector 가 동일 단일 출처를 import 해 쓰는지(중복 로직 방지).
    assert _ct_in_collector is classify_threshold


# ── Free 마스킹: threshold_status 유지, 원시 level 마스킹 ─────────────────────


def _metric_with_status(status):
    return TickerMetric(
        symbol="^VIX",
        layer=Layer.GLOBAL_MACRO,
        display_name="변동성지수(VIX)",
        free_visible=True,
        latest=30.0,
        prev_close=28.0,
        change_pct=7.14,
        trend=TrendInfo(label="uptrend", sma5=29.0, sma20=25.0),
        status="ok",
        threshold_status=status,
        error="some pro error",
    )


def test_free_mask_keeps_threshold_status_drops_raw_level():
    snap = MarketSnapshot(metrics=[_metric_with_status("danger")])
    masked = _mask_snapshot_for_free(snap)
    m = masked.metrics[0]

    # Free 결론 신호: 유지.
    assert m.threshold_status == "danger"
    assert m.change_pct == 7.14
    assert m.trend.label == "uptrend"

    # 원시 level / pro 필드: 마스킹.
    assert m.latest is None
    assert m.prev_close is None
    assert m.error is None
    assert m.trend.sma5 is None
    assert m.trend.sma20 is None


def test_threshold_status_default_none_when_no_rule():
    # 임계값 규칙이 없는 합성 티커는 기본 None 이어야 한다.
    m = TickerMetric(
        symbol="NO_RULE",
        layer=Layer.SECTOR_STOCK,
        display_name="규칙없음",
    )
    assert m.threshold_status is None
