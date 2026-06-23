"""regime.classify_regime 엔진 단위 테스트.

검증 범위(네트워크 없이 합성 IndicatorReading 으로):
- 점수→라벨: 전 지표 calm→RISK_ON, danger→RISK_OFF, 중간값→NEUTRAL.
- 커버리지 가드: 입력이 비면 coverage<min_coverage → NEUTRAL + weak confidence.
- tier 게이팅: PRO→RegimeEvidence(score 등 노출), FREE→EvidenceLocked.
- 설계철학: 어떤 라벨에서도 headline 에 '매도' 단정 없음.

임계값/컷오프는 settings.regime(config 단일 출처)에서만 온다.
"""

from __future__ import annotations

from app.config import settings
from app.engine.regime import _resolve_label, classify_regime
from app.models import (
    EvidenceLocked,
    IndicatorReading,
    RegimeEvidence,
    RegimeLabel,
    Tier,
)


def _readings_at(level: str) -> dict[str, IndicatorReading]:
    """config 의 모든 지표 규칙을 calm/danger/mid 값으로 채운 입력 생성.

    metric=level 이면 value, momentum 이면 change_pct 에 넣는다.
    9개 규칙 전부 calm·danger 가 정의돼 있어 coverage=1.0(가드 미발동).
    """
    out: dict[str, IndicatorReading] = {}
    for ticker, rule in settings.regime.indicator_rules.items():
        calm, danger = rule.calm_threshold, rule.danger_threshold
        assert calm is not None and danger is not None
        raw = {
            "calm": calm,
            "danger": danger,
            "mid": (calm + danger) / 2.0,
        }[level]
        kwargs: dict[str, object] = {
            "ticker": ticker,
            "layer": rule.layer,
            "display_name": rule.display_name,
        }
        if rule.metric == "level":
            kwargs["value"] = raw
        else:
            kwargs["change_pct"] = raw
        out[ticker] = IndicatorReading(**kwargs)
    return out


# ── 점수 → 라벨 ──────────────────────────────────────────────────────────────


def test_all_calm_is_risk_on():
    result = classify_regime(_readings_at("calm"))
    assert result.conclusion.label == RegimeLabel.RISK_ON


def test_all_danger_is_risk_off():
    result = classify_regime(_readings_at("danger"))
    assert result.conclusion.label == RegimeLabel.RISK_OFF


def test_mid_values_are_neutral():
    result = classify_regime(_readings_at("mid"))
    assert result.conclusion.label == RegimeLabel.NEUTRAL


def test_resolve_label_cutoff_boundaries():
    # 컷오프 경계 의미를 직접 검증(config 값 기준, 하드코딩 금지):
    # score >= cutoff_risk_on → RISK_ON, score <= cutoff_risk_off → RISK_OFF, 그 사이 → NEUTRAL.
    cfg = settings.regime
    assert _resolve_label(cfg.cutoff_risk_on, cfg) == RegimeLabel.RISK_ON
    assert _resolve_label(cfg.cutoff_risk_on - 0.01, cfg) == RegimeLabel.NEUTRAL
    assert _resolve_label(cfg.cutoff_risk_off, cfg) == RegimeLabel.RISK_OFF
    assert _resolve_label(cfg.cutoff_risk_off + 0.01, cfg) == RegimeLabel.NEUTRAL
    assert _resolve_label(0.0, cfg) == RegimeLabel.NEUTRAL


# ── 커버리지 가드 ────────────────────────────────────────────────────────────


def test_empty_input_triggers_coverage_guard():
    # 입력이 비면 모든 지표 결측 → coverage 0 < min_coverage → 중립+약한 확신 강제.
    result = classify_regime({})
    assert result.conclusion.label == RegimeLabel.NEUTRAL
    assert result.conclusion.confidence.level == "weak"


# ── tier 게이팅 ──────────────────────────────────────────────────────────────


def test_pro_exposes_evidence():
    result = classify_regime(_readings_at("calm"), tier=Tier.PRO)
    assert isinstance(result.evidence, RegimeEvidence)
    # 점수가 양수(리스크온)로 노출되는지 — 수치는 Pro 에서만.
    assert result.evidence.score > 0


def test_free_locks_evidence():
    result = classify_regime(_readings_at("calm"), tier=Tier.FREE)
    assert isinstance(result.evidence, EvidenceLocked)
    assert result.tier == Tier.FREE


# ── 설계철학: '매도' 단정 금지 ───────────────────────────────────────────────


def test_no_sell_command_in_headline():
    for level in ("calm", "danger", "mid"):
        result = classify_regime(_readings_at(level))
        assert "매도" not in result.conclusion.headline
    # disclaimer 는 항상 존재.
    assert classify_regime({}).disclaimer
