"""외국인 순매수 어댑터 단위 테스트.

검증 범위:
- compute_sell_streak 순수 함수(연속 순매도 판정, 경계/결측).
- 자격증명 미설정 시 정직한 stub 폴백(available=False, source='stub').
- 일1회 파일캐시(오늘자 캐시 재사용, 어제 캐시 무시).
- snapshot_to_readings 가 미수집 외국인 신호를 정직하게 제외.

외부 네트워크/KRX 호출 없이 실행되도록 환경변수/캐시경로를 격리한다.
"""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone

import pytest

from app.data import foreign_flow as ff
from app.models import ForeignFlowReading


# ── compute_sell_streak ──────────────────────────────────────────────────────


@pytest.mark.parametrize(
    "series,expected",
    [
        ([], 0),
        ([100.0, 200.0], 0),  # 최신이 순매수 → 0
        ([100.0, -50.0], 1),
        ([-10.0, -20.0, -30.0], 3),
        ([100.0, -10.0, -20.0, -30.0], 3),  # 과거 순매수는 끊김
        ([-10.0, 0.0, -30.0], 1),  # 0(경계)에서 끊김
        ([-10.0, -20.0, 5.0], 0),  # 최신이 순매수
    ],
)
def test_compute_sell_streak(series, expected):
    assert ff.compute_sell_streak(series) == expected


def test_compute_sell_streak_none_breaks():
    # 결측(None)은 연속을 끊는다(가짜 음수로 오인 금지).
    assert ff.compute_sell_streak([-10.0, None, -30.0]) == 1


# ── 자격증명 미설정 → stub 폴백 ──────────────────────────────────────────────


def test_no_credentials_falls_back_to_stub(monkeypatch, tmp_path):
    monkeypatch.delenv("KRX_ID", raising=False)
    monkeypatch.delenv("KRX_PW", raising=False)
    monkeypatch.setattr(ff.settings, "foreign_flow_cache_dir", str(tmp_path))
    monkeypatch.setattr(ff.settings, "foreign_flow_enabled", True)

    reading = ff.fetch_foreign_flow(market="KOSPI")

    assert isinstance(reading, ForeignFlowReading)
    assert reading.available is False
    assert reading.source == "stub"
    assert reading.consecutive_sell_days is None
    assert reading.net_buy_latest_krw_eok is None


def test_disabled_returns_stub(monkeypatch, tmp_path):
    monkeypatch.setattr(ff.settings, "foreign_flow_enabled", False)
    monkeypatch.setattr(ff.settings, "foreign_flow_cache_dir", str(tmp_path))
    reading = ff.fetch_foreign_flow(market="KOSPI")
    assert reading.available is False
    assert "비활성" in reading.note


# ── 일1회 파일캐시 ───────────────────────────────────────────────────────────


def _write_cache(tmp_path, market, asof: datetime, available: bool):
    reading = ForeignFlowReading(
        available=available,
        source="pykrx" if available else "stub",
        market=market,
        consecutive_sell_days=7 if available else None,
        net_buy_latest_krw_eok=-1234.5 if available else None,
        net_buy=-1234.5 if available else None,
        series=[("2026-06-10", -1234.5)] if available else None,
        asof=asof,
        note="test",
    )
    path = ff._cache_path(market)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(reading.model_dump_json(), encoding="utf-8")
    return reading


def test_today_cache_is_reused(monkeypatch, tmp_path):
    monkeypatch.setattr(ff.settings, "foreign_flow_cache_dir", str(tmp_path))
    monkeypatch.setattr(ff.settings, "foreign_flow_enabled", True)
    # 자격증명 없어도 오늘자 신선 캐시가 있으면 그걸 반환해야 함.
    monkeypatch.delenv("KRX_ID", raising=False)
    monkeypatch.delenv("KRX_PW", raising=False)

    today = datetime.now(timezone.utc)
    _write_cache(tmp_path, "KOSPI", today, available=True)

    reading = ff.fetch_foreign_flow(market="KOSPI")
    assert reading.available is True
    assert reading.source == "pykrx"
    assert reading.consecutive_sell_days == 7


def test_yesterday_cache_is_stale_not_reused(monkeypatch, tmp_path):
    monkeypatch.setattr(ff.settings, "foreign_flow_cache_dir", str(tmp_path))
    monkeypatch.setattr(ff.settings, "foreign_flow_enabled", True)
    monkeypatch.delenv("KRX_ID", raising=False)
    monkeypatch.delenv("KRX_PW", raising=False)

    yesterday = datetime.now(timezone.utc) - timedelta(days=1)
    _write_cache(tmp_path, "KOSPI", yesterday, available=True)

    # 어제 캐시는 신선하지 않음 → 자격증명 없으니 stub 폴백.
    reading = ff.fetch_foreign_flow(market="KOSPI")
    assert reading.available is False
    assert reading.source == "stub"


def test_is_fresh_today_naive_datetime(monkeypatch, tmp_path):
    # tz-naive asof 도 UTC 로 간주해 오늘 비교가 동작해야 함.
    naive = datetime.utcnow()
    reading = ForeignFlowReading(asof=naive, market="KOSPI")
    assert ff._is_fresh_today(reading) is True


# ── snapshot_to_readings 정직한 제외 ─────────────────────────────────────────


def test_snapshot_excludes_unavailable_foreign_flow():
    from app.data.collector import FOREIGN_FLOW_TICKER, snapshot_to_readings
    from app.models import MarketSnapshot

    snap = MarketSnapshot(foreign_flow=ForeignFlowReading(available=False))
    readings = snapshot_to_readings(snap)
    assert FOREIGN_FLOW_TICKER not in readings


def test_snapshot_includes_available_foreign_flow():
    from app.data.collector import FOREIGN_FLOW_TICKER, snapshot_to_readings
    from app.models import MarketSnapshot

    snap = MarketSnapshot(
        foreign_flow=ForeignFlowReading(
            available=True,
            source="pykrx",
            consecutive_sell_days=10,
            net_buy_latest_krw_eok=-2000.0,
        )
    )
    readings = snapshot_to_readings(snap)
    assert FOREIGN_FLOW_TICKER in readings
    r = readings[FOREIGN_FLOW_TICKER]
    assert r.value == 10.0
    assert r.source == "pykrx"
