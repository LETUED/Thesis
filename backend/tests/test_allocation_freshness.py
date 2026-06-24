"""BE allocation 신선도(cache_status) 회귀.

배분 결론이 기반한 데이터 신선도를 결론과 함께 싣는다(철학5).
라우터(post_allocation)가 snapshot.cache_status 를 주입하며, 엔진 기본은 fresh.
네트워크 없이 합성 입력으로 검증한다.
"""

from __future__ import annotations

import asyncio

from app.config import settings
from app.engine.allocation import compute_allocation
from app.engine.regime import classify_regime
from app.models import AllocationRequest, AllocationResult, MarketSnapshot, Tier


def _body() -> AllocationRequest:
    return AllocationRequest(
        risk_tolerance="moderate",
        horizon="mid",
        reflect_current_regime=True,
        tier=Tier.FREE,
    )


def test_allocation_result_carries_cache_status():
    # AllocationResult 가 cache_status 필드를 싣는다(필드 삭제 회귀 방지).
    regime = classify_regime({}, settings.regime, Tier.FREE)
    result = compute_allocation(_body(), regime, settings.allocation)
    assert isinstance(result, AllocationResult)
    assert result.cache_status in ("fresh", "cached", "stale")


def test_allocation_cache_status_serialized():
    # 직렬화(응답 페이로드)에 cache_status 가 포함된다 — 프론트가 신선도 칩에 쓴다.
    regime = classify_regime({}, settings.regime, Tier.FREE)
    result = compute_allocation(_body(), regime, settings.allocation)
    payload = result.model_dump()
    assert "cache_status" in payload


def test_post_allocation_injects_snapshot_cache_status(monkeypatch):
    # 핵심 회귀: 라우터(post_allocation)가 snapshot.cache_status 를 결과에 주입한다.
    # 엔진은 항상 fresh 기본이라, 이 주입이 빠지면 stale 데이터가 fresh 로 오표기된다(철학5).
    # 네트워크 없이 _snapshot 을 stale snapshot 으로 대체해 주입 경로만 검증.
    from app.api import routes

    stale = MarketSnapshot(cache_status="stale")

    async def _fake_snapshot(_cache: object) -> MarketSnapshot:
        return stale

    monkeypatch.setattr(routes, "_snapshot", _fake_snapshot)

    result = asyncio.run(routes.post_allocation(_body(), tier=Tier.FREE, cache=None))
    assert isinstance(result, AllocationResult)
    assert result.cache_status == "stale"  # snapshot 신선도가 결론에 전달됨
