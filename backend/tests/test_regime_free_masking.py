"""BE 확신도 원시 수치(score·rationale) Free 마스킹 회귀 테스트.

설계철학 4(수치 비노출) + _pro 게이팅 누락 방지:
- confidence.rationale 은 "신호강도 73%, 합의도 65%" 같은 기술 수치 문구,
  confidence.score 는 그 종합 점수(0~1) — 둘 다 입문자에 비노출(_pro).
- _pro 마커(json_schema_extra)는 OpenAPI 메타일 뿐 자동 직렬화 필터가 아니므로,
  classify_regime 이 tier!=PRO 일 때 페이로드에서 score/rationale 을 제거해야 한다.
- 입문자 친화 라벨(probabilistic_label)·level 은 Free 에도 유지된다.

두 confidence 경로를 모두 검증한다:
- 커버리지 부족 경로: 빈 입력 {} (coverage=0 < min_coverage)
- 정상 경로(_compute_confidence): 모든 규칙 지표에 관측치를 채워 강제
네트워크 없이 합성 입력으로만 검증한다.
"""

from __future__ import annotations

from app.config import settings
from app.engine.regime import classify_regime
from app.models import IndicatorReading, Tier


def _full_readings() -> dict[str, IndicatorReading]:
    """모든 규칙 지표에 관측치를 채워 coverage>=min_coverage(정상 경로 _compute_confidence)를 강제."""
    rules = settings.regime.indicator_rules
    return {
        ticker: IndicatorReading(
            ticker=ticker,
            layer=rule.layer,
            display_name=rule.display_name,
            value=1.0,
            change_pct=0.0,
        )
        for ticker, rule in rules.items()
    }


# ── 커버리지 부족 경로(빈 입력) ──────────────────────────────────────────────


def test_free_masks_rationale_and_score_low_coverage():
    result = classify_regime({}, settings.regime, Tier.FREE)
    assert result.conclusion.confidence.rationale is None
    assert result.conclusion.confidence.score is None


def test_pro_keeps_rationale_and_score_low_coverage():
    result = classify_regime({}, settings.regime, Tier.PRO)
    assert result.conclusion.confidence.rationale is not None
    assert result.conclusion.confidence.score is not None


def test_free_keeps_probabilistic_label():
    # 입문자 친화 정성 라벨은 Free 에도 보존(결론 자체는 무료).
    result = classify_regime({}, settings.regime, Tier.FREE)
    assert result.conclusion.confidence.probabilistic_label
    assert result.conclusion.confidence.level  # 막대 칸수용 정성 등급은 유지


def test_default_tier_is_free_masked():
    # tier 인자 생략 시 기본 FREE → 마스킹된다(fail-closed).
    result = classify_regime({}, settings.regime)
    assert result.conclusion.confidence.rationale is None
    assert result.conclusion.confidence.score is None


# ── 정상 경로(_compute_confidence) — 변경이 핵심으로 지목한 경로 ─────────────


def test_free_masks_normal_path():
    result = classify_regime(_full_readings(), settings.regime, Tier.FREE)
    assert result.conclusion.confidence.rationale is None
    assert result.conclusion.confidence.score is None
    assert result.conclusion.confidence.probabilistic_label  # 정성 라벨 보존


def test_pro_keeps_normal_path_rationale():
    result = classify_regime(_full_readings(), settings.regime, Tier.PRO)
    assert result.conclusion.confidence.score is not None
    # 정상 경로 고유 토큰(커버리지부족 문장이 아닌 '신호강도/합의도')으로 '그 rationale' 보존을 고정.
    rationale = result.conclusion.confidence.rationale
    assert rationale is not None
    assert "신호강도" in rationale
    assert "합의도" in rationale
