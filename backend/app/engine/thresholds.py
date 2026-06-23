"""임계값 분류 단일 출처 — 지표 원시값 + 규칙 → calm/neutral/warn/danger.

regime 엔진(근거 코멘트)과 collector(TickerMetric.threshold_status)가 같은
판정 로직을 공유하도록 여기로 추출했다. 매직넘버 금지: 임계값은 항상 호출자가
넘기는 IndicatorRule(=config) 에서만 온다.

direction 의미:
- higher_is_risk_off: 값↑ = 위험. danger >= warn >= calm 순으로 경계가 올라간다.
- higher_is_risk_on:  값↑ = 안정. calm >= danger 순으로 경계가 내려간다.
"""

from __future__ import annotations

from app.config import IndicatorRule
from app.models import ThresholdHit

__all__ = ["classify_threshold"]


def classify_threshold(raw: float, rule: IndicatorRule) -> ThresholdHit:
    """원시값이 calm/warn/danger 중 어느 구간인지 라벨링.

    임계값이 None 인 끝은 비교를 건너뛴다(해당 방향 경계 미정의로 간주).
    매칭되는 경계가 없으면 'neutral'.
    """
    calm = rule.calm_threshold
    warn = rule.warn_threshold
    danger = rule.danger_threshold

    if rule.direction == "higher_is_risk_off":
        # 값↑ = 위험. danger >= warn >= calm 순.
        if danger is not None and raw >= danger:
            return "danger"
        if warn is not None and raw >= warn:
            return "warn"
        if calm is not None and raw <= calm:
            return "calm"
        return "neutral"

    # higher_is_risk_on: 값↑ = 안정. calm >= danger 순.
    if danger is not None and raw <= danger:
        return "danger"
    if calm is not None and raw >= calm:
        return "calm"
    return "neutral"
