"""allocation(자산배분) 엔진 단위 테스트.

검증 범위:
- 불변식: stocks+cash+safe == 100, cash >= min_cash_pct(20%) — 엔진이 유일한 방어선
- _build_headline 의 '지금 사세요/매도' 단정 금지(철학1) — 모든 stance·미반영 분기
- tier 게이팅: FREE 는 EvidenceLocked(수치 금지), PRO 는 AllocationEvidence(철학6)
- validate_single_position 15% 경계(단일종목 한도)

네트워크 없이 실행(순수 함수). cycle_2 가 회피한 엔진 커버리지 백필(cycle_3/05 정비).
"""

from __future__ import annotations

import pytest

from app.config import settings
from app.engine.allocation import compute_allocation, validate_single_position
from app.models import (
    AllocationEvidence,
    AllocationRequest,
    Confidence,
    EvidenceLocked,
    IndicatorContribution,
    InvestmentHorizon,
    RegimeConclusion,
    RegimeEvidence,
    RegimeLabel,
    RegimeResult,
    RiskToleranceLabel,
    Tier,
)


def _regime(
    label: RegimeLabel = RegimeLabel.NEUTRAL,
    *,
    evidence=None,
    tier: Tier = Tier.FREE,
) -> RegimeResult:
    return RegimeResult(
        conclusion=RegimeConclusion(
            label=label,
            headline="테스트 국면 결론",
            confidence=Confidence(
                level="moderate", score=0.5, probabilistic_label="가능성 수준"
            ),
        ),
        evidence=evidence if evidence is not None else EvidenceLocked(),
        disclaimer="참고용 정보입니다.",
        tier=tier,
    )


_RISKS = [
    "very_conservative",
    "conservative",
    "moderate",
    "aggressive",
    "very_aggressive",
]
_HORIZONS = ["short", "mid", "long"]


# ── 불변식: 합계 100 + 현금 하한 20% (모든 성향×기간×반영여부) ──────────────────
@pytest.mark.parametrize("risk", _RISKS)
@pytest.mark.parametrize("horizon", _HORIZONS)
@pytest.mark.parametrize("reflect", [True, False])
def test_allocation_sum_100_and_cash_floor(risk, horizon, reflect):
    req = AllocationRequest(
        risk_tolerance=RiskToleranceLabel(risk),
        horizon=InvestmentHorizon(horizon),
        reflect_current_regime=reflect,
        tier=Tier.FREE,
    )
    mix = compute_allocation(req, _regime()).conclusion.mix
    total = mix.stocks_pct + mix.cash_pct + mix.safe_pct
    assert abs(total - 100.0) < 0.01, f"합계 {total} ≠ 100"
    assert mix.cash_pct >= settings.allocation.min_cash_pct - 0.01, (
        f"현금 {mix.cash_pct}% < 하한 {settings.allocation.min_cash_pct}%"
    )


# ── 헤드라인 '지금 사세요/매도' 단정 금지(철학1) — 전 stance ─────────────────────
@pytest.mark.parametrize(
    "label", [RegimeLabel.RISK_ON, RegimeLabel.NEUTRAL, RegimeLabel.RISK_OFF]
)
@pytest.mark.parametrize("reflect", [True, False])
def test_allocation_headline_never_commands(label, reflect):
    req = AllocationRequest(
        risk_tolerance=RiskToleranceLabel("moderate"),
        horizon=InvestmentHorizon("mid"),
        reflect_current_regime=reflect,
        tier=Tier.PRO,
    )
    regime = _regime(
        label,
        evidence=RegimeEvidence(score=0.0, coverage=0.6, consensus=0.5),
        tier=Tier.PRO,
    )
    head = compute_allocation(req, regime).conclusion.headline
    assert head
    for word in ["매도", "매수하세요", "사세요", "파세요", "팔아", "늘리세요", "줄이세요"]:
        assert word not in head, f"{label} 헤드라인에 단정 표현 '{word}'"


# ── tier 게이팅: FREE 는 evidence 잠금(수치 금지), PRO 는 노출 ───────────────────
def test_allocation_free_locks_evidence():
    req = AllocationRequest(
        risk_tolerance=RiskToleranceLabel("moderate"),
        horizon=InvestmentHorizon("mid"),
        tier=Tier.FREE,
    )
    res = compute_allocation(req, _regime())
    assert isinstance(res.evidence, EvidenceLocked)
    for line in res.evidence.locked_summary or []:
        assert not any(ch.isdigit() for ch in line), f"잠금 요약 수치 노출: {line}"


def test_allocation_pro_exposes_evidence():
    req = AllocationRequest(
        risk_tolerance=RiskToleranceLabel("moderate"),
        horizon=InvestmentHorizon("mid"),
        tier=Tier.PRO,
    )
    regime = _regime(
        evidence=RegimeEvidence(score=0.0, coverage=0.6, consensus=0.5),
        tier=Tier.PRO,
    )
    res = compute_allocation(req, regime)
    assert isinstance(res.evidence, AllocationEvidence)


# ── 단일종목 한도 15% 경계(> 만 위반, 경계 15.0 은 허용) ─────────────────────────
def test_validate_single_position_boundary():
    assert validate_single_position(15.0).violated is False  # 경계 포함 안 됨
    assert validate_single_position(15.01).violated is True
    assert validate_single_position(40.0).violated is True
    assert validate_single_position(10.0).violated is False


# ── 한국 디리스킹 실경로(철학7) — cycle_2 회피 엔진의 한국특화 핵심 ────────────────
def _pro_regime_with_usdkrw(usdkrw: float) -> RegimeResult:
    contribs = [
        IndicatorContribution(
            ticker="KRW=X",
            display_name="원달러 환율",
            raw_value=usdkrw,
            contribution=-0.5,
            weight=1.6,
            direction="higher_is_risk_off",
            comparison_text=f"원달러 {usdkrw:.0f}",
        )
    ]
    return _regime(
        RegimeLabel.RISK_OFF,
        evidence=RegimeEvidence(
            score=-50.0, coverage=0.7, consensus=0.6, contributions=contribs
        ),
        tier=Tier.PRO,
    )


def test_allocation_korea_derisk_reduces_stocks_and_fills_signals():
    req = AllocationRequest(
        risk_tolerance=RiskToleranceLabel("aggressive"),
        horizon=InvestmentHorizon("long"),
        reflect_current_regime=True,
        tier=Tier.PRO,
    )
    high = compute_allocation(req, _pro_regime_with_usdkrw(1500.0))  # 디리스킹 발동(≥1400)
    low = compute_allocation(req, _pro_regime_with_usdkrw(1300.0))  # 미발동

    # 원달러 고위험 → 한국 디리스킹이 주식을 더 줄인다(derisk 실경로 검증).
    assert high.conclusion.mix.stocks_pct < low.conclusion.mix.stocks_pct
    # PRO evidence 에 한국 신호가 실제로 채워진다(빈 껍데기 아님).
    assert isinstance(high.evidence, AllocationEvidence)
    assert len(high.evidence.korea_signals) > 0
    # derisk 후에도 불변식 유지.
    m = high.conclusion.mix
    assert abs(m.stocks_pct + m.cash_pct + m.safe_pct - 100.0) < 0.01
    assert m.cash_pct >= settings.allocation.min_cash_pct - 0.01


def test_allocation_free_skips_korea_derisk():
    # FREE(잠긴 evidence)면 한국 디리스킹 미적용(원시수치 못 읽음) — 정직성 철학7.
    req = AllocationRequest(
        risk_tolerance=RiskToleranceLabel("aggressive"),
        horizon=InvestmentHorizon("long"),
        reflect_current_regime=True,
        tier=Tier.FREE,
    )
    res = compute_allocation(req, _regime(RegimeLabel.RISK_OFF))  # evidence locked
    assert isinstance(res.evidence, EvidenceLocked)
