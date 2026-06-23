"""국면(regime) 판정 엔진 — 지표 입력을 점수화해 리스크온/중립/리스크오프로 분류.

설계 철학 강제:
- 출력은 conclusion(무료) / evidence(Pro 상세) / confidence(확률표현) / disclaimer 4분리.
- conclusion 은 수치 노출 없이 top_drivers 의 '방향'만. score 는 evidence(Pro) 에만.
- '매도하세요' 류 단정 금지 — RISK_OFF 가 최고 경계 톤이며 문구는 '리스크가 높아졌습니다'.
- 임계값/가중치/컷오프는 전부 config(RegimeConfig)에서만 온다. 매직넘버 금지.
- 외국인 순매수 등 결측 지표는 가중치 재정규화로 제외하고 coverage 로 정직하게 추적(철학7).
- coverage < min_coverage 면 NEUTRAL + weak confidence 로 강제(구현자 가드).

regime 입력은 dict[str, IndicatorReading] (collector → snapshot_to_readings 어댑터가 생성).
"""

from __future__ import annotations

from app.config import IndicatorRule, RegimeConfig, settings
from app.engine.thresholds import classify_threshold
from app.models import (
    Confidence,
    EvidenceLocked,
    IndicatorContribution,
    IndicatorReading,
    RegimeConclusion,
    RegimeEvidence,
    RegimeLabel,
    RegimeResult,
    Tier,
)

__all__ = [
    "classify_regime",
]


# ── 지표 단위 점수화 ─────────────────────────────────────────────────────────


def _score_indicator(
    reading: IndicatorReading, rule: IndicatorRule
) -> IndicatorContribution:
    """단일 지표를 규칙에 따라 [-1,+1] 기여도로 정규화.

    +1 = 리스크온(안정) 방향, -1 = 리스크오프(위험) 방향.
    calm_threshold ↔ danger_threshold 를 선형 보간한다.
    direction(higher_is_risk_off/on)과 metric(level/momentum)에 따라
    어느 끝이 +1/-1 인지 결정된다.
    """
    raw = reading.value if rule.metric == "level" else reading.change_pct

    calm = rule.calm_threshold
    danger = rule.danger_threshold

    contribution = 0.0
    threshold_hit = None

    if raw is not None and calm is not None and danger is not None:
        span = calm - danger
        if span == 0:
            contribution = 0.0
        else:
            # raw 가 calm 이면 +1, danger 면 -1 이 되도록 보간.
            t = (raw - danger) / span  # danger=0 .. calm=1
            contribution = max(-1.0, min(1.0, t * 2.0 - 1.0))
        threshold_hit = classify_threshold(raw, rule)

    comparison_text = _comparison_text(reading, rule, raw, threshold_hit)

    # contribution 은 항상 '리스크온(+)/리스크오프(-)' 의미로 정렬되어야 한다.
    # 위 보간은 calm→+1 / danger→-1 을 주므로 두 direction 모두 의미가 일치한다
    # (calm_threshold 가 곧 '안정값', danger_threshold 가 '위험값'이기 때문).
    return IndicatorContribution(
        ticker=reading.ticker,
        display_name=reading.display_name,
        raw_value=raw,
        contribution=round(contribution, 4),
        weight=rule.weight,
        direction=rule.direction,
        threshold_hit=threshold_hit,
        comparison_text=comparison_text,
    )


def _fmt(v: float | None) -> str:
    if v is None:
        return "데이터 없음"
    if abs(v) >= 100:
        return f"{v:,.1f}"
    return f"{v:.2f}"


def _comparison_text(
    reading: IndicatorReading,
    rule: IndicatorRule,
    raw: float | None,
    threshold_hit,
) -> str:
    """'원달러 1,420.00 — 주의 임계값 1,400 초과' 류 근거 문구(Pro)."""
    name = reading.display_name
    if raw is None:
        return f"{name} — 데이터 미수집(가중치에서 제외)"

    unit = "" if rule.metric == "level" else "%(전일대비)"
    base = f"{name} {_fmt(raw)}{unit}"

    if threshold_hit == "danger":
        ref = rule.danger_threshold
        return f"{base} — 위험 임계값 {_fmt(ref)} 영역"
    if threshold_hit == "warn":
        ref = rule.warn_threshold
        return f"{base} — 주의 임계값 {_fmt(ref)} 도달"
    if threshold_hit == "calm":
        ref = rule.calm_threshold
        return f"{base} — 안정 임계값 {_fmt(ref)} 영역"
    return f"{base} — 중립 구간"


# ── 집계 ─────────────────────────────────────────────────────────────────────


def _aggregate_score(
    contributions: list[IndicatorContribution],
    layer_weights: dict[str, float],
) -> tuple[float, float, dict[str, float]]:
    """가중 집계. 결측(raw_value=None) 지표는 제외하고 가중치 재정규화.

    Returns:
        (score[-100,+100], coverage[0,1], layer_breakdown[layer_value -> score])
    """
    # 결측 제외: 데이터 없는 지표는 분모(coverage)에서 빠진다(철학7 정직성).
    present = [c for c in contributions if c.raw_value is not None]

    total_weight_all = sum(c.weight for c in contributions) or 1.0
    present_weight = sum(c.weight for c in present)
    coverage = present_weight / total_weight_all

    if not present or present_weight == 0:
        return 0.0, round(coverage, 4), {}

    # 레이어별 가중 평균 → 레이어 가중치로 다시 가중 평균.
    layer_num: dict[str, float] = {}
    layer_den: dict[str, float] = {}
    for c in present:
        lw = _layer_of(c, layer_weights)
        layer_num[lw] = layer_num.get(lw, 0.0) + c.contribution * c.weight
        layer_den[lw] = layer_den.get(lw, 0.0) + c.weight

    layer_breakdown: dict[str, float] = {}
    weighted_sum = 0.0
    weight_sum = 0.0
    for layer_value, num in layer_num.items():
        den = layer_den[layer_value] or 1.0
        layer_score = num / den  # [-1,+1]
        layer_breakdown[layer_value] = round(layer_score * 100.0, 2)
        lw = layer_weights.get(layer_value, 1.0)
        weighted_sum += layer_score * lw
        weight_sum += lw

    raw_score = (weighted_sum / weight_sum) if weight_sum else 0.0
    score = max(-100.0, min(100.0, raw_score * 100.0))
    return round(score, 2), round(coverage, 4), layer_breakdown


def _layer_of(
    contribution: IndicatorContribution, layer_weights: dict[str, float]
) -> str:
    """기여도가 속한 레이어 키를 규칙에서 역추적.

    IndicatorContribution 에는 layer 가 없으므로 indicator_rules 에서 찾는다.
    """
    rule = settings.regime.indicator_rules.get(contribution.ticker)
    if rule is not None:
        return rule.layer.value
    return next(iter(layer_weights), "L1")


# ── 라벨/확신도 ──────────────────────────────────────────────────────────────


def _resolve_label(score: float, config: RegimeConfig) -> RegimeLabel:
    """점수 → 국면 라벨. 컷오프는 config 에서.

    score >= cutoff_risk_on   → 리스크온
    score <= cutoff_risk_off  → 리스크오프
    그 사이                    → 중립
    '매도' 단정 라벨은 존재하지 않는다.
    """
    if score >= config.cutoff_risk_on:
        return RegimeLabel.RISK_ON
    if score <= config.cutoff_risk_off:
        return RegimeLabel.RISK_OFF
    return RegimeLabel.NEUTRAL


def _compute_confidence(
    score: float,
    coverage: float,
    contributions: list[IndicatorContribution],
) -> Confidence:
    """확신도 — 항상 확률적 라벨. 표준편차/단정 금지.

    구성: 신호 강도(|score|), 데이터 커버리지, 지표 합의도(consensus)를 종합.
    """
    present = [c for c in contributions if c.raw_value is not None]
    consensus = _consensus(present)

    strength = min(1.0, abs(score) / 100.0)
    # 세 요소를 곱이 아닌 가중합으로 — 하나가 0이어도 완전히 죽지 않게.
    raw = 0.45 * strength + 0.30 * coverage + 0.25 * consensus
    score01 = max(0.0, min(1.0, raw))

    if score01 >= 0.66:
        level = "strong"
        label = "비교적 뚜렷한 신호로 보입니다(확정 아님)"
    elif score01 >= 0.4:
        level = "moderate"
        label = "어느 정도 일관된 신호입니다(가능성 수준)"
    else:
        level = "weak"
        label = "신호가 약하거나 엇갈립니다(참고 수준)"

    rationale = (
        f"신호강도 {strength:.0%}, 데이터 커버리지 {coverage:.0%}, "
        f"지표 합의도 {consensus:.0%} 종합."
    )
    return Confidence(
        level=level,
        score=round(score01, 4),
        probabilistic_label=label,
        rationale=rationale,
    )


def _consensus(present: list[IndicatorContribution]) -> float:
    """지표들이 같은 방향을 가리키는 정도 [0,1].

    가중 평균 부호와 같은 방향 비중이 클수록 1에 가깝다.
    """
    if not present:
        return 0.0
    total_w = sum(c.weight for c in present) or 1.0
    mean = sum(c.contribution * c.weight for c in present) / total_w
    if mean == 0:
        return 0.0
    aligned = sum(
        c.weight for c in present if (c.contribution >= 0) == (mean >= 0)
    )
    return round(aligned / total_w, 4)


# ── 무료 결론 문구 ───────────────────────────────────────────────────────────


def _headline(label: RegimeLabel) -> str:
    """무료 노출 한 줄 결론. '매도' 동사 없이 톤만 전달."""
    return {
        RegimeLabel.RISK_ON: "현재 시장은 위험선호 성향이 우세한 근거가 많습니다.",
        RegimeLabel.NEUTRAL: "현재 시장은 방향성이 뚜렷하지 않은 혼조 국면입니다.",
        RegimeLabel.RISK_OFF: "현재 시장은 위험회피 압력이 높아지고 있습니다.",
    }[label]


def _top_drivers(
    contributions: list[IndicatorContribution], label: RegimeLabel
) -> list[str]:
    """무료 노출 주요 동인 — 수치 없이 '방향'만 (철학3·6).

    종합 라벨과 같은 방향으로 기여한 지표를 가중 절대기여 순으로 상위 3개.
    """
    present = [c for c in contributions if c.raw_value is not None]
    if not present:
        return ["수집된 지표가 부족해 근거를 충분히 제시하기 어렵습니다."]

    if label == RegimeLabel.RISK_ON:
        relevant = [c for c in present if c.contribution > 0]
        verb = "안정 신호"
    elif label == RegimeLabel.RISK_OFF:
        relevant = [c for c in present if c.contribution < 0]
        verb = "위험 신호"
    else:
        relevant = present
        verb = "혼조 신호"

    relevant.sort(key=lambda c: abs(c.contribution) * c.weight, reverse=True)
    pool = relevant or present
    drivers = [f"{c.display_name}에서 {verb}가 관찰됩니다." for c in pool[:3]]
    return drivers


# ── 진입점 ───────────────────────────────────────────────────────────────────


def classify_regime(
    indicators: dict[str, IndicatorReading],
    config: RegimeConfig = settings.regime,
    tier: Tier = Tier.FREE,
) -> RegimeResult:
    """지표 입력 → 국면 판정. 계약 시그니처 정확히 구현.

    Args:
        indicators: ticker -> IndicatorReading (collector 어댑터 산출물).
        config: 임계값/가중치 (config.RegimeConfig). 매직넘버 단일 출처.
        tier: FREE 면 evidence 를 EvidenceLocked 로 게이팅.

    Returns:
        RegimeResult: conclusion(free) + evidence(pro/locked) + disclaimer(필수).
    """
    rules = config.indicator_rules

    # 규칙이 정의된 지표만 점수화. 규칙 없는 티커(예: 금/WTI)는 현재 미채점.
    contributions: list[IndicatorContribution] = []
    for ticker, rule in rules.items():
        reading = indicators.get(ticker)
        if reading is None:
            # 입력에 없으면 결측 기여(raw_value=None) 로 넣어 coverage 에 반영.
            contributions.append(
                IndicatorContribution(
                    ticker=ticker,
                    display_name=rule.display_name,
                    raw_value=None,
                    contribution=0.0,
                    weight=rule.weight,
                    direction=rule.direction,
                    threshold_hit=None,
                    comparison_text=f"{rule.display_name} — 데이터 미수집(가중치에서 제외)",
                )
            )
            continue
        contributions.append(_score_indicator(reading, rule))

    score, coverage, layer_breakdown = _aggregate_score(
        contributions, config.layer_weights
    )

    # 구현자 가드: 커버리지 부족이면 중립 + 약한 확신으로 강제(과신 방지).
    if coverage < config.min_coverage:
        label = RegimeLabel.NEUTRAL
        confidence = Confidence(
            level="weak",
            score=round(min(coverage, 0.3), 4),
            probabilistic_label="데이터가 부족해 판단을 보류합니다(참고 수준).",
            rationale=(
                f"데이터 커버리지 {coverage:.0%} 가 최소 기준 "
                f"{config.min_coverage:.0%} 에 미달하여 중립으로 처리했습니다."
            ),
        )
    else:
        label = _resolve_label(score, config)
        confidence = _compute_confidence(score, coverage, contributions)

    conclusion = RegimeConclusion(
        label=label,
        headline=_headline(label),
        confidence=confidence,
        top_drivers=_top_drivers(contributions, label),
    )

    consensus = _consensus([c for c in contributions if c.raw_value is not None])
    evidence: RegimeEvidence | EvidenceLocked
    if tier == Tier.PRO:
        evidence = RegimeEvidence(
            score=score,
            coverage=coverage,
            consensus=consensus,
            contributions=contributions,
            layer_breakdown=layer_breakdown,
        )
    else:
        # Free: 가려진 항목을 '라벨만' 노출(수치 금지) — Pro 결핍 가시화.
        present_names = [
            c.display_name for c in contributions if c.raw_value is not None
        ]
        locked_summary = [f"{name} 상세 근거" for name in present_names] or [
            "지표별 상세 근거"
        ]
        locked_summary += ["임계값 비교", "레이어별 기여도"]
        evidence = EvidenceLocked(locked_summary=locked_summary)

    return RegimeResult(
        conclusion=conclusion,
        evidence=evidence,
        disclaimer=settings.disclaimer,
        tier=tier,
    )
