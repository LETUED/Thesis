"""BE 종가 정제(_sanitize_closes) 회귀 — 데이터 신뢰성.

시세는 양수 불변식. yfinance 가 데이터 오류로 음수/0/NaN 을 반환해도 결론이 오염되지 않게
정제한다(fundamentals 음수 PER 차단과 일관). 네트워크 없이 순수 함수로 검증.
"""

from __future__ import annotations

import math

from app.data.collector import _sanitize_closes


def test_drops_nan_negative_zero():
    raw = [100.0, float("nan"), -5.0, 0.0, 102.5]
    assert _sanitize_closes(raw) == [100.0, 102.5]


def test_all_invalid_returns_empty():
    # 전부 무효 → 빈 리스트(호출자가 status='failed' 로 표면화).
    assert _sanitize_closes([float("nan"), -1.0, 0.0]) == []


def test_keeps_valid_positive_floats():
    raw = [1.0, 1420.5, 0.0001]
    assert _sanitize_closes(raw) == [1.0, 1420.5, 0.0001]


def test_negative_does_not_leak_into_trend():
    # 음수 종가가 섞여도 정제 후엔 양수만 — 추세/레벨 계산이 오염되지 않는다.
    cleaned = _sanitize_closes([50.0, -50.0, 60.0])
    assert all(v > 0 for v in cleaned)
    assert not any(math.isnan(v) for v in cleaned)