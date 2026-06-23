"""API 라우트 스모크 테스트 — HTTP 계약을 TestClient 로 검증.

프론트 게스트 모드(무가입 열람)가 의존하는 핵심 계약:
- 익명(토큰 없음)은 401 이 아니라 200 + tier=free 로 응답한다.
- Free 는 evidence 가 잠기고(EvidenceLocked) 원시 수치가 마스킹된다. PRO 는 노출.
- 수집기(외부 데이터) 실패는 502 graceful ErrorResponse 로 반환된다.

외부 네트워크(yfinance) 차단: app.api.routes.collect_all 을 합성 MarketSnapshot 으로 monkeypatch.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

import app.api.routes as routes_mod
from app.deps import get_user_tier
from app.main import create_app
from app.models import MarketSnapshot, TickerMetric, Tier, TrendInfo
from app.tickers import Layer


def _metric(symbol: str, name: str, latest: float, change_pct: float) -> TickerMetric:
    return TickerMetric(
        symbol=symbol,
        layer=Layer.GLOBAL_MACRO,  # 엔진은 layer 를 config 규칙에서 재도출하므로 표시용일 뿐.
        display_name=name,
        free_visible=True,
        latest=latest,
        prev_close=latest - 1.0,
        change_pct=change_pct,
        trend=TrendInfo(label="uptrend", sma5=latest, sma20=latest),
        status="ok",
    )


def _snapshot() -> MarketSnapshot:
    """합성 스냅샷 — 규칙 지표 4종(가중 합 5.1/8.7 ≈ 0.59 ≥ min_coverage 0.5)으로
    coverage 가드를 피해 실제 스코어링 경로(_aggregate_score)를 태운다.
    metrics[0]=VIX 는 free 마스킹 단언 대상. snapshot_to_readings 는 latest=None 을
    제외하므로 모든 지표에 latest 를 채운다(momentum 규칙도 reading 생성에 latest 필요).
    """
    return MarketSnapshot(
        metrics=[
            _metric("^VIX", "변동성지수(VIX)", 20.0, 5.26),
            _metric("DX-Y.NYB", "달러인덱스(DXY)", 103.0, 0.1),
            _metric("KRW=X", "원달러 환율", 1350.0, 0.2),
            _metric("^KS11", "코스피", 2500.0, 1.0),
        ],
        disclaimer="",
    )


@pytest.fixture
def app():
    return create_app()


@pytest.fixture
def client(app):
    return TestClient(app)


@pytest.fixture(autouse=True)
def _stub_collect(monkeypatch):
    # 외부 네트워크 차단 — 라우트의 collect_all 을 합성 스냅샷으로 교체(기본: 성공).
    monkeypatch.setattr(routes_mod, "collect_all", lambda **kwargs: _snapshot())


# ── health ───────────────────────────────────────────────────────────────────


def test_health_ok(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


# ── 익명 → free (게스트 계약) ────────────────────────────────────────────────


def test_regime_anonymous_is_free_and_locked(client):
    r = client.get("/api/regime")
    assert r.status_code == 200
    body = r.json()
    assert body["tier"] == "free"
    assert body["disclaimer"]
    # Free → evidence 잠김.
    assert body["evidence"]["locked"] is True
    assert "score" not in body["evidence"]


def test_allocation_anonymous_is_free(client):
    r = client.post(
        "/api/allocation",
        json={
            "risk_tolerance": "moderate",
            "horizon": "mid",
            "reflect_current_regime": True,
            "tier": "pro",  # 서버가 무시하고 free 로 덮어쓴다(클라이언트 tier 불신).
        },
    )
    assert r.status_code == 200
    body = r.json()
    assert body["tier"] == "free"
    mix = body["conclusion"]["mix"]
    total = mix["stocks_pct"] + mix["cash_pct"] + mix["safe_pct"]
    assert total == pytest.approx(100.0)
    assert mix["cash_pct"] >= 20.0 - 1e-9


def test_indicators_free_masks_raw_levels(client):
    r = client.get("/api/indicators")
    assert r.status_code == 200
    m = r.json()["metrics"][0]
    assert m["latest"] is None  # _pro 원시수치 마스킹
    assert m["change_pct"] is not None  # _free 요약 유지


# ── PRO 게이팅 ───────────────────────────────────────────────────────────────


def test_pro_unlocks_evidence_and_raw(app, client):
    app.dependency_overrides[get_user_tier] = lambda: Tier.PRO
    try:
        regime = client.get("/api/regime").json()
        assert "score" in regime["evidence"]  # RegimeEvidence(pro): 수치 노출

        ind = client.get("/api/indicators").json()
        assert ind["metrics"][0]["latest"] == 20.0  # pro 원시수치 노출
    finally:
        app.dependency_overrides.clear()


# ── 502 graceful ─────────────────────────────────────────────────────────────


def test_collector_failure_is_502_graceful(client, monkeypatch):
    def _boom(**kwargs):
        raise RuntimeError("yfinance down")

    monkeypatch.setattr(routes_mod, "collect_all", _boom)
    r = client.get("/api/regime")
    assert r.status_code == 502
    body = r.json()
    assert body["error"]["code"] == "regime_unavailable"
    # 단정/매도 톤 없음.
    assert "매도" not in body["error"]["message"]


def test_allocation_collector_failure_is_502_graceful(client, monkeypatch):
    def _boom(**kwargs):
        raise RuntimeError("yfinance down")

    monkeypatch.setattr(routes_mod, "collect_all", _boom)
    r = client.post(
        "/api/allocation",
        json={
            "risk_tolerance": "moderate",
            "horizon": "mid",
            "reflect_current_regime": True,
            "tier": "free",
        },
    )
    assert r.status_code == 502
    assert r.json()["error"]["code"] == "allocation_unavailable"
