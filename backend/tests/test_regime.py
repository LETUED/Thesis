"""regime 엔진(classify_regime + 라벨/헤드라인) 단위 테스트.

검증 범위:
- _resolve_label score→라벨 경계(±cutoff 포함 경계, >= / <=)
- _headline 의 '매도 단정 금지' 결론 카피 불변식(설계철학5)
- classify_regime coverage 가드(데이터 부족 시 과신 방지 강제 NEUTRAL)
- tier 게이팅(FREE 는 raw 미노출 EvidenceLocked, PRO 는 RegimeEvidence — 철학6)
- disclaimer 항상 포함

네트워크 없이 실행(순수 함수). cycle_2 가 회피한 엔진 커버리지 백필(cycle_3/04 정비).
"""

from __future__ import annotations

import pytest

from app.config import settings
from app.engine.regime import _headline, _resolve_label, classify_regime
from app.models import (
    EvidenceLocked,
    IndicatorReading,
    RegimeEvidence,
    RegimeLabel,
    Tier,
)
from app.tickers import Layer


# ── score → 라벨 경계 (컷오프는 config 단일 출처, ±25 포함 경계) ──────────────
@pytest.mark.parametrize(
    "score,expected",
    [
        (25.0, RegimeLabel.RISK_ON),  # >= 경계 포함
        (24.99, RegimeLabel.NEUTRAL),
        (100.0, RegimeLabel.RISK_ON),
        (-25.0, RegimeLabel.RISK_OFF),  # <= 경계 포함
        (-24.99, RegimeLabel.NEUTRAL),
        (-100.0, RegimeLabel.RISK_OFF),
        (0.0, RegimeLabel.NEUTRAL),
    ],
)
def test_resolve_label_cutoff_boundaries(score, expected):
    assert _resolve_label(score, settings.regime) == expected


# ── '매도 단정 금지' 결론 카피 불변식(철학5·regime.py docstring) ───────────────
def test_headline_never_commands_buy_or_sell():
    forbidden = ["매도", "매수하세요", "사세요", "파세요", "팔아", "지금 사"]
    for label in RegimeLabel:
        text = _headline(label)
        assert text, f"{label} 에 결론 문구가 없습니다"
        for word in forbidden:
            assert word not in text, f"{label} 결론에 단정 표현 '{word}' 포함"


# ── coverage 가드: 강한 신호여도 데이터 부족이면 강제 NEUTRAL + weak (과신방지) ──
def test_classify_regime_strong_signal_low_coverage_forced_neutral():
    # 단일 VIX=40(극단 위험) → score 강한 음수지만 coverage 미달 → 가드가 NEUTRAL 로 누른다.
    # (빈입력은 score=0 이라 가드 없이도 NEUTRAL → 가드를 검증 못 함. cy6 위조 감시 적발 반영.)
    vix = IndicatorReading(
        ticker="^VIX",
        layer=Layer.GLOBAL_MACRO,
        display_name="변동성지수(VIX)",
        value=40.0,
    )
    result = classify_regime({"^VIX": vix}, tier=Tier.PRO)
    assert isinstance(result.evidence, RegimeEvidence)
    assert result.evidence.score <= -90.0  # 신호 자체는 강함
    assert result.evidence.coverage < settings.regime.min_coverage  # 데이터 부족
    assert result.conclusion.label == RegimeLabel.NEUTRAL  # 가드가 눌렀다
    assert result.conclusion.confidence.level == "weak"


# ── tier 게이팅: FREE 는 evidence 잠금(raw 수치 미노출), PRO 는 노출 ────────────
def test_classify_regime_free_locks_evidence():
    result = classify_regime({}, tier=Tier.FREE)
    assert isinstance(result.evidence, EvidenceLocked)
    assert result.evidence.locked is True
    # 잠금 요약은 라벨 텍스트만 — 숫자(raw 수치)가 새지 않아야 한다.
    for line in result.evidence.locked_summary or []:
        assert not any(ch.isdigit() for ch in line), f"잠금 요약에 수치 노출: {line}"


def test_classify_regime_pro_exposes_evidence():
    result = classify_regime({}, tier=Tier.PRO)
    assert isinstance(result.evidence, RegimeEvidence)
    # 빈 입력이라 score/coverage 는 0 이지만 evidence 타입·필드는 노출된다.
    assert result.evidence.score == 0.0
    assert result.evidence.coverage == 0.0


# ── disclaimer 항상 포함(과신 방지의 엔진 레벨 보장) ─────────────────────────────
def test_classify_regime_always_has_disclaimer():
    assert classify_regime({}, tier=Tier.FREE).disclaimer
