"""compute_trend 단위 테스트 — 단·장기 SMA 추세 라벨 산출의 순수 로직.

결정성: 합성 종가 리스트로만 검증한다(네트워크·시간 무관, yfinance 미접촉).
기대 SMA 값은 모두 2진 정확표현(dyadic)인 값만 골라 `==` 로 단언한다.
라벨 경계(±0.5%)의 정확히 0.5% 지점은 1/200=0.005 가 비-dyadic이라
float 로 정확 표현되지 않는 knife-edge → 플레이키 위험으로 의도적 제외.
대신 밴드 안의 비-영(non-zero) spread(≈0.37%, 0.5에서 충분히 이격)로
'밴드 폭이 존재함'을 견고하게 검증한다.
"""

from __future__ import annotations

from app.data.collector import compute_trend


def test_insufficient_data_when_fewer_than_long():
    # clean 길이가 long(20) 미만 → 라벨만 insufficient_data, SMA 미산출(None).
    trend = compute_trend([100.0] * 19)
    assert trend.label == "insufficient_data"
    assert trend.sma5 is None
    assert trend.sma20 is None


def test_uptrend_when_short_sma_above_band():
    # last5 평균(110) 이 last20 평균(102.5) 보다 +0.5% 초과 → uptrend.
    trend = compute_trend([100.0] * 15 + [110.0] * 5)
    assert trend.label == "uptrend"
    assert trend.sma5 == 110.0
    assert trend.sma20 == 102.5  # (15*100 + 5*110)/20


def test_downtrend_when_short_sma_below_band():
    # last5 평균(90) 이 last20 평균(97.5) 보다 -0.5% 미만 → downtrend.
    trend = compute_trend([100.0] * 15 + [90.0] * 5)
    assert trend.label == "downtrend"
    assert trend.sma5 == 90.0
    assert trend.sma20 == 97.5  # (15*100 + 5*90)/20


def test_sideways_when_flat():
    # spread 0 → 밴드 내 → sideways.
    trend = compute_trend([100.0] * 20)
    assert trend.label == "sideways"
    assert trend.sma5 == 100.0
    assert trend.sma20 == 100.0


def test_sideways_when_nonzero_spread_within_band():
    # 비-영 spread 이지만 ±0.5% 밴드 안 → sideways(밴드 폭이 실제로 존재함을 검증).
    # sma5=100.5, sma20=100.125 → spread=(100.5-100.125)/100.125*100 ≈ 0.37% < 0.5.
    trend = compute_trend([100.0] * 15 + [100.5] * 5)
    assert trend.label == "sideways"
    assert trend.sma5 == 100.5
    assert trend.sma20 == 100.125  # (15*100 + 5*100.5)/20


def test_sideways_when_long_sma_is_zero():
    # 0 나눗셈 가드: sma_long==0 이면 spread 계산 없이 sideways, SMA 는 0 그대로.
    trend = compute_trend([0.0] * 20)
    assert trend.label == "sideways"
    assert trend.sma5 == 0.0
    assert trend.sma20 == 0.0


def test_none_values_are_filtered_out():
    # None 이 섞여도 제거 후 clean(20개) 로 정상 산출 — sum(None) 크래시 없이 sideways.
    trend = compute_trend([None, None, None] + [100.0] * 20)  # type: ignore[list-item]
    assert trend.label == "sideways"
    assert trend.sma5 == 100.0
    assert trend.sma20 == 100.0


def test_none_values_excluded_from_length_count():
    # 길이 판정은 None 제거 후 clean 기준 — raw 28개여도 clean 18개<20 → insufficient_data.
    trend = compute_trend([None] * 10 + [100.0] * 18)  # type: ignore[list-item]
    assert trend.label == "insufficient_data"


def test_sma_values_are_accurate():
    # 서로 다른 값으로 SMA 산출 정확성 검증: closes=1..20.
    # sma5 = (16+17+18+19+20)/5 = 18.0, sma20 = 210/20 = 10.5 → 큰 양의 spread → uptrend.
    trend = compute_trend([float(i) for i in range(1, 21)])
    assert trend.label == "uptrend"
    assert trend.sma5 == 18.0
    assert trend.sma20 == 10.5
