"""allocation 엔진(compute_allocation, validate_single_position) 단위 테스트.

검증 범위(네트워크 없이 합성 입력으로):
- 불변식: stocks+cash+safe == 100, cash >= min_cash_pct(20).
- min_cash 강제: 공격적 조합(주식↑→현금↓)에서 현금 하한이 끌어올려지고 note 가 남는다.
- reflect_current_regime=False: 국면/섹터 틸트 생략, 기초 배분만.
- 국면 틸트 방향: RISK_ON 주식% > NEUTRAL > RISK_OFF (같은 risk×horizon).
- tier 게이팅: PRO→AllocationEvidence, FREE→EvidenceLocked.
- validate_single_position: 한도(15%) 경계.

임계값(min_cash·single_position·matrix·tilt)은 settings.allocation(단일 출처)에서만 온다.
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
    InvestmentHorizon,
    RegimeConclusion,
    RegimeLabel,
    RegimeResult,
    RiskToleranceLabel,
    Tier,
)

_CFG = settings.allocation


def _regime(label: RegimeLabel) -> RegimeResult:
    """엔진 비결합 — models 로 직접 구성한 국면 결과(allocation 입력용)."""
    return RegimeResult(
        conclusion=RegimeConclusion(
            label=label,
            headline="합성 국면 결론(테스트).",
            confidence=Confidence(
                level="moderate",
                score=0.5,
                probabilistic_label="가능성 수준",
                rationale="테스트용",
            ),
            top_drivers=[],
        ),
        evidence=EvidenceLocked(locked_summary=["x"]),
        disclaimer="d",
        tier=Tier.FREE,
    )


def _req(
    risk: str = "moderate",
    horizon: str = "mid",
    reflect: bool = True,
    tier: Tier = Tier.FREE,
) -> AllocationRequest:
    return AllocationRequest(
        risk_tolerance=RiskToleranceLabel(risk),
        horizon=InvestmentHorizon(horizon),
        reflect_current_regime=reflect,
        tier=tier,
    )


_COMBOS = [
    ("very_conservative", "short"),
    ("moderate", "mid"),
    ("aggressive", "long"),
    ("very_aggressive", "long"),
]


# ── 불변식 ───────────────────────────────────────────────────────────────────


@pytest.mark.parametrize("risk,horizon", _COMBOS)
@pytest.mark.parametrize("reflect", [True, False])
@pytest.mark.parametrize("label", [RegimeLabel.RISK_ON, RegimeLabel.NEUTRAL, RegimeLabel.RISK_OFF])
def test_mix_sums_to_100_and_cash_floor(risk, horizon, reflect, label):
    res = compute_allocation(_req(risk, horizon, reflect), _regime(label))
    mix = res.conclusion.mix
    assert mix.stocks_pct + mix.cash_pct + mix.safe_pct == pytest.approx(100.0)
    assert mix.cash_pct >= _CFG.min_cash_pct - 1e-9
    assert mix.stocks_pct >= 0 and mix.safe_pct >= 0


# ── min_cash 강제 ────────────────────────────────────────────────────────────


def test_aggressive_triggers_min_cash_note():
    # very_aggressive×long → 기초 주식 80 → 현금 10(<20). reflect=False 로 틸트 격리.
    res = compute_allocation(
        _req("very_aggressive", "long", reflect=False, tier=Tier.PRO),
        _regime(RegimeLabel.NEUTRAL),
    )
    assert res.conclusion.mix.cash_pct >= _CFG.min_cash_pct - 1e-9
    assert isinstance(res.evidence, AllocationEvidence)
    note = next(n for n in res.evidence.constraint_notes if n.name == "min_cash")
    assert note.applied is True


# ── reflect=False ────────────────────────────────────────────────────────────


def test_reflect_false_skips_regime_tilt():
    res = compute_allocation(_req(reflect=False), _regime(RegimeLabel.RISK_OFF))
    assert res.conclusion.sector_tilts_summary == []
    assert res.conclusion.headline.startswith("위험성향과 투자기간을 바탕으로")


# ── 국면 틸트 방향 ───────────────────────────────────────────────────────────


def test_regime_tilt_direction_orders_stocks():
    # 같은 risk×horizon(moderate×mid)에서 RISK_ON > NEUTRAL > RISK_OFF 주식 비중.
    def stocks(label: RegimeLabel) -> float:
        return compute_allocation(_req(reflect=True), _regime(label)).conclusion.mix.stocks_pct

    on, neutral, off = stocks(RegimeLabel.RISK_ON), stocks(RegimeLabel.NEUTRAL), stocks(RegimeLabel.RISK_OFF)
    assert on > neutral > off


# ── tier 게이팅 ──────────────────────────────────────────────────────────────


def test_tier_gating():
    pro = compute_allocation(_req(tier=Tier.PRO), _regime(RegimeLabel.NEUTRAL))
    free = compute_allocation(_req(tier=Tier.FREE), _regime(RegimeLabel.NEUTRAL))
    assert isinstance(pro.evidence, AllocationEvidence)
    assert isinstance(free.evidence, EvidenceLocked)


# ── 단일 종목 한도 ───────────────────────────────────────────────────────────


def test_validate_single_position_boundary():
    assert validate_single_position(10.0).violated is False
    # 경계(==15)는 위반 아님(> 한도일 때만 위반).
    assert validate_single_position(15.0).violated is False
    assert validate_single_position(15.1).violated is True

    check = validate_single_position(20.0)
    assert check.limit_pct == _CFG.max_single_position_pct
    assert check.weight_pct == 20.0
