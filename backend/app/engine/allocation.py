"""자산배분 엔진 — 국면(RegimeResult) + 입문자 파라미터 → 자산 믹스 + 섹터틸트 + 근거.

철학 강제:
- 철학1: '지금 사세요/매도하세요' 금지. headline 은 항상 '근거가 많습니다' 톤.
- 철학2: Top-Down — regime(매크로/자산배분) 결론을 받아서 비중을 틸트한다.
- 철학4: 리스크 허용도는 5단계 감정 라벨의 한국어 문구로만 노출.
- 철학6: conclusion(free) / evidence(pro) 물리 분리. confidence 는 정성 라벨만.
- 철학7: 한국 디리스킹(원달러/VIX/외국인) 신호를 별도 단계로 명시.

불변식(스키마+엔진 이중 강제):
- stocks + cash + safe == 100
- cash >= cfg.min_cash_pct (현금 최소 20%)
- 단일 종목 최대 cfg.max_single_position_pct (15%) — validate_single_position 로 점검.
"""

from __future__ import annotations

from app.config import AllocationConfig, settings
from app.models import (
    AllocationConclusion,
    AllocationEvidence,
    AllocationRequest,
    AllocationResult,
    AssetMix,
    ConstraintCheck,
    ConstraintNote,
    EvidenceLocked,
    InvestmentHorizon,
    RegimeLabel,
    RegimeResult,
    RiskToleranceLabel,
    SectorTilt,
    Tier,
)

__all__ = [
    "compute_allocation",
    "validate_single_position",
]


# ── 내부 헬퍼: 기초 믹스 ─────────────────────────────────────────────────────


def _base_mix(
    risk: RiskToleranceLabel, horizon: InvestmentHorizon, cfg: AllocationConfig
) -> AssetMix:
    """risk × horizon 매트릭스로 기초 주식 비중을 잡고 나머지를 현금/안전자산에 배분.

    안전자산(채권 등) 비중은 보수적일수록 두텁게 — 잔여를 현금:안전 = 1:1 로 나누되
    현금이 최소선 아래로 떨어지지 않도록 _enforce_constraints 가 최종 보정한다.
    """
    matrix = cfg.base_stocks_matrix
    stocks = matrix.get(risk.value, {}).get(horizon.value, 50.0)
    stocks = _clamp(stocks, 0.0, 100.0)

    remaining = 100.0 - stocks
    # 잔여를 현금/안전자산으로 균등 분배(이후 제약 단계에서 현금 하한 보정).
    cash = remaining / 2.0
    safe = remaining - cash
    return AssetMix(stocks_pct=stocks, cash_pct=cash, safe_pct=safe)


# ── 내부 헬퍼: 국면 틸트 ─────────────────────────────────────────────────────


def _apply_regime_tilt(
    mix: AssetMix, regime: RegimeResult, cfg: AllocationConfig
) -> tuple[AssetMix, list[str]]:
    """국면 라벨에 따라 주식 비중을 가감(%p). 리스크오프면 주식↓·안전자산↑.

    stance 는 conclusion.label.value 문자열로 매핑되며 .get(stance, 0.0) 으로 KeyError 방지.
    """
    reasons: list[str] = []
    stance = regime.conclusion.label.value
    delta = cfg.regime_tilt.get(stance, 0.0)
    if delta == 0.0:
        reasons.append(
            f"현재 국면은 '{stance}'으로, 기초 비중을 그대로 유지할 근거가 우세합니다."
        )
        return mix, reasons

    new_stocks = _clamp(mix.stocks_pct + delta, 0.0, 100.0)
    applied = new_stocks - mix.stocks_pct  # 클램프 후 실제 적용량
    # 주식에서 덜어낸/더한 만큼은 안전자산에서 상계(현금 하한 보호는 제약 단계가 담당).
    new_safe = _clamp(mix.safe_pct - applied, 0.0, 100.0)
    tilted = AssetMix(
        stocks_pct=new_stocks,
        cash_pct=mix.cash_pct,
        safe_pct=new_safe,
    )

    if delta > 0:
        reasons.append(
            f"위험선호 국면('{stance}') 근거로 주식 비중을 약 {applied:.0f}%p 높일 여지가 있습니다."
        )
    else:
        reasons.append(
            f"위험회피 국면('{stance}') 근거로 주식 비중을 약 {abs(applied):.0f}%p 낮추고 "
            "안전자산 비중을 높일 근거가 많아졌습니다."
        )
    return tilted, reasons


# ── 내부 헬퍼: 한국 디리스킹 ─────────────────────────────────────────────────


def _apply_korea_derisk(
    mix: AssetMix, regime: RegimeResult, cfg: AllocationConfig
) -> tuple[AssetMix, list[str]]:
    """한국 특화 위험 신호(원달러/VIX/외국인) → 주식 비중 추가 차감(%p).

    철학7 정직성: regime 의 pro evidence(contributions)에서 원시 수치를 읽되,
    free 티어라 evidence 가 잠겨 있으면 한국 신호 판단은 생략하고 그 한계를 명시한다.
    외국인 순매수는 ForeignFlowStub(available=False)라 항상 '데이터 미수집'으로 처리.
    """
    signals: list[str] = []
    derisk = 0.0

    ev = regime.evidence
    if isinstance(ev, AllocationEvidence) or not _has_contributions(ev):
        # evidence 잠김(free) 또는 근거 부재 — 한국 신호를 정직하게 미적용.
        signals.append(
            "한국 디리스킹 신호(원달러·VIX)는 상세 근거(Pro)에서만 평가됩니다. "
            "외국인 순매수 데이터는 현재 미수집 상태입니다."
        )
        return mix, signals

    usdkrw = _raw_value(ev, "KRW=X")
    vix = _raw_value(ev, "^VIX")

    if usdkrw is not None:
        if usdkrw >= cfg.usdkrw_risk:
            derisk += cfg.usdkrw_risk_derisk_pct
            signals.append(
                f"원달러 {usdkrw:,.0f}원 — 위험 임계({cfg.usdkrw_risk:,.0f}) 도달, "
                f"주식 비중을 {cfg.usdkrw_risk_derisk_pct:.0f}%p 더 줄일 근거가 있습니다."
            )
        elif usdkrw >= cfg.usdkrw_caution:
            derisk += cfg.usdkrw_caution_derisk_pct
            signals.append(
                f"원달러 {usdkrw:,.0f}원 — 주의 임계({cfg.usdkrw_caution:,.0f}) 초과, "
                f"방어적으로 {cfg.usdkrw_caution_derisk_pct:.0f}%p 줄일 여지가 있습니다."
            )

    if vix is not None and vix >= cfg.vix_risk:
        derisk += cfg.vix_derisk_pct
        signals.append(
            f"VIX {vix:.1f} — 위험 임계({cfg.vix_risk:.0f}) 도달, "
            f"변동성 확대를 반영해 {cfg.vix_derisk_pct:.0f}%p 줄일 근거가 있습니다."
        )

    # 외국인 순매수는 stub — 정직하게 미수집 명시(가짜 차감 금지).
    signals.append(
        f"외국인 {cfg.foreign_sell_streak}일 연속 순매도 경고는 데이터 미수집으로 "
        "현재 평가에서 제외했습니다(KRX 연동 준비중)."
    )

    if derisk <= 0.0:
        if not signals:
            signals.append("한국 매크로 측면의 추가 디리스킹 신호는 확인되지 않았습니다.")
        return mix, signals

    new_stocks = _clamp(mix.stocks_pct - derisk, 0.0, 100.0)
    applied = mix.stocks_pct - new_stocks
    new_safe = _clamp(mix.safe_pct + applied, 0.0, 100.0)
    derisked = AssetMix(
        stocks_pct=new_stocks,
        cash_pct=mix.cash_pct,
        safe_pct=new_safe,
    )
    return derisked, signals


# ── 내부 헬퍼: 제약 강제 ─────────────────────────────────────────────────────


def _enforce_constraints(
    mix: AssetMix, cfg: AllocationConfig
) -> tuple[AssetMix, list[ConstraintNote]]:
    """현금 최소 하한 강제 + 합계 100 정규화. 단일종목 한도는 validate_single_position 책임.

    현금이 하한 미만이면 부족분을 주식에서 우선 차감(공격성 억제), 그래도 모자라면
    안전자산에서 보충한다.
    """
    notes: list[ConstraintNote] = []
    stocks, cash, safe = mix.stocks_pct, mix.cash_pct, mix.safe_pct

    min_cash = cfg.min_cash_pct
    if cash < min_cash:
        shortfall = min_cash - cash
        take_from_stocks = min(shortfall, stocks)
        stocks -= take_from_stocks
        cash += take_from_stocks
        still_short = min_cash - cash
        if still_short > 0:
            take_from_safe = min(still_short, safe)
            safe -= take_from_safe
            cash += take_from_safe
        notes.append(
            ConstraintNote(
                name="min_cash",
                applied=True,
                message=(
                    f"현금 최소 {min_cash:.0f}% 규칙에 따라 현금 비중을 {cash:.0f}%로 "
                    "끌어올렸습니다(주식·안전자산에서 충당)."
                ),
            )
        )
    else:
        notes.append(
            ConstraintNote(
                name="min_cash",
                applied=False,
                message=f"현금 비중 {cash:.0f}%로 최소 기준({min_cash:.0f}%)을 이미 충족합니다.",
            )
        )

    stocks = _clamp(stocks, 0.0, 100.0)
    cash = _clamp(cash, 0.0, 100.0)
    safe = _clamp(safe, 0.0, 100.0)

    # 부동소수 오차/클램프로 합계가 100을 벗어날 수 있어 안전자산으로 잔차 흡수.
    total = stocks + cash + safe
    drift = 100.0 - total
    if abs(drift) > 1e-9:
        safe = _clamp(safe + drift, 0.0, 100.0)
        # 안전자산만으로 못 맞추면 주식으로 잔차 마무리(현금 하한은 건드리지 않음).
        total = stocks + cash + safe
        residual = 100.0 - total
        if abs(residual) > 1e-9:
            stocks = _clamp(stocks + residual, 0.0, 100.0)

    # 표시 단순화를 위해 소수 1자리 반올림 후 합계는 안전자산이 흡수.
    stocks = round(stocks, 1)
    cash = round(cash, 1)
    safe = round(100.0 - stocks - cash, 1)
    if safe < 0:
        # 반올림 역전 방어: 음수면 주식에서 상계.
        stocks = round(stocks + safe, 1)
        safe = 0.0

    enforced = AssetMix(stocks_pct=stocks, cash_pct=cash, safe_pct=safe)
    return enforced, notes


# ── 내부 헬퍼: 섹터 틸트 ─────────────────────────────────────────────────────


def _sector_tilt(
    regime: RegimeResult, risk: RiskToleranceLabel, cfg: AllocationConfig
) -> list[SectorTilt]:
    """국면별 섹터 틸트 제안(방향만 free, rationale pro). 비율 필드 없음.

    보수적 투자자에게는 overweight 제안의 강도를 문구로 누그러뜨린다(방향은 유지).
    """
    stance = regime.conclusion.label.value
    rules = cfg.sector_tilt_rules.get(stance, [])

    soften = risk in (
        RiskToleranceLabel.VERY_CONSERVATIVE,
        RiskToleranceLabel.CONSERVATIVE,
    )

    tilts: list[SectorTilt] = []
    for rule in rules:
        rationale = rule.rationale
        if soften and rule.direction == "overweight":
            rationale = (
                f"{rationale} (다만 보수적 성향이라면 비중 확대는 점진적으로 접근할 근거가 있습니다.)"
            )
        tilts.append(
            SectorTilt(
                sector=rule.sector,
                direction=rule.direction,
                rationale=rationale,
            )
        )
    return tilts


# ── 공개 API: 단일 종목 한도 점검 ────────────────────────────────────────────


def validate_single_position(
    weight_pct: float, cfg: AllocationConfig = settings.allocation
) -> ConstraintCheck:
    """단일 종목 비중이 한도(기본 15%)를 넘는지 점검. '매도 명령' 아님 — 근거 제시 톤."""
    limit = cfg.max_single_position_pct
    violated = weight_pct > limit
    if violated:
        message = (
            f"단일 종목 {weight_pct:.1f}%는 권장 상한({limit:.0f}%)을 넘습니다. "
            "집중 위험이 커진 상태이니 분산을 검토할 근거가 있습니다."
        )
    else:
        message = (
            f"단일 종목 {weight_pct:.1f}%는 권장 상한({limit:.0f}%) 이내로 "
            "집중 위험은 관리 가능한 수준입니다."
        )
    return ConstraintCheck(
        limit_pct=limit,
        weight_pct=weight_pct,
        violated=violated,
        message=message,
    )


# ── 공개 API: 자산배분 계산 ──────────────────────────────────────────────────


def compute_allocation(
    inp: AllocationRequest,
    regime: RegimeResult,
    cfg: AllocationConfig = settings.allocation,
) -> AllocationResult:
    """입문자 입력 + 국면 → 자산 믹스/섹터틸트/근거. tier 에 따라 evidence 게이팅.

    파이프라인: 기초믹스 → (옵션)국면틸트 → 한국디리스킹 → 제약강제.
    reflect_current_regime=False 면 국면/한국 틸트를 건너뛰고 기초 믹스만 제약한다.
    """
    risk = inp.risk_tolerance
    horizon = inp.horizon

    regime_reasons: list[str] = []
    korea_signals: list[str] = []

    mix = _base_mix(risk, horizon, cfg)

    if inp.reflect_current_regime:
        mix, regime_reasons = _apply_regime_tilt(mix, regime, cfg)
        mix, korea_signals = _apply_korea_derisk(mix, regime, cfg)
    else:
        regime_reasons.append(
            "현재 국면을 반영하지 않도록 선택하셨습니다 — 위험성향·투자기간 기반 기초 배분만 제시합니다."
        )

    mix, constraint_notes = _enforce_constraints(mix, cfg)

    sector_tilts = _sector_tilt(regime, risk, cfg) if inp.reflect_current_regime else []

    headline = _build_headline(regime.conclusion.label, mix, inp.reflect_current_regime)
    risk_label_text = cfg.risk_label_text.get(risk.value, risk.value)
    sector_summary = [f"{t.sector}: {_direction_ko(t.direction)}" for t in sector_tilts]

    conclusion = AllocationConclusion(
        mix=mix,
        headline=headline,
        risk_label_text=risk_label_text,
        sector_tilts_summary=sector_summary,
    )

    confidence = _confidence_label(regime, inp.reflect_current_regime)

    if inp.tier == Tier.PRO:
        evidence: AllocationEvidence | EvidenceLocked = AllocationEvidence(
            regime_reasons=regime_reasons,
            korea_signals=korea_signals,
            constraint_notes=constraint_notes,
            base_matrix_cell=f"{risk.value} × {horizon.value}",
            sector_tilts=sector_tilts,
        )
    else:
        # Free: 가려진 근거 카테고리를 '라벨만' 노출(수치 금지) — Pro 결핍 가시화.
        evidence = EvidenceLocked(
            locked_summary=["국면 반영 근거", "한국 디리스킹 신호", "제약 적용 내역", "섹터 틸트"]
        )

    return AllocationResult(
        conclusion=conclusion,
        evidence=evidence,
        confidence=confidence,
        disclaimer=settings.disclaimer,
        tier=inp.tier,
    )


# ── 문구/유틸 ────────────────────────────────────────────────────────────────


def _build_headline(
    label: RegimeLabel, mix: AssetMix, reflected: bool
) -> str:
    """결론 헤드라인. 철학1: 단정/매도 동사 금지 — '근거가 많습니다' 톤."""
    if not reflected:
        return (
            f"위험성향과 투자기간을 바탕으로 주식 {mix.stocks_pct:.0f}% · "
            f"현금 {mix.cash_pct:.0f}% · 안전자산 {mix.safe_pct:.0f}% 배분을 고려할 근거가 있습니다."
        )
    if label == RegimeLabel.RISK_OFF:
        return (
            f"현재 국면에서는 방어적 비중(주식 {mix.stocks_pct:.0f}%·현금 {mix.cash_pct:.0f}%·"
            f"안전자산 {mix.safe_pct:.0f}%)을 고려할 근거가 많습니다."
        )
    if label == RegimeLabel.RISK_ON:
        return (
            f"현재 국면에서는 성장 비중(주식 {mix.stocks_pct:.0f}%·현금 {mix.cash_pct:.0f}%·"
            f"안전자산 {mix.safe_pct:.0f}%)을 늘려볼 근거가 있습니다."
        )
    return (
        f"현재 국면은 중립적이며, 균형 잡힌 배분(주식 {mix.stocks_pct:.0f}%·"
        f"현금 {mix.cash_pct:.0f}%·안전자산 {mix.safe_pct:.0f}%)을 고려할 근거가 있습니다."
    )


def _confidence_label(
    regime: RegimeResult, reflected: bool
) -> str:
    """allocation 확신도(정성 라벨만: low/moderate/high). 국면 confidence 를 승계."""
    if not reflected:
        return "moderate"
    level = regime.conclusion.confidence.level
    return {"weak": "low", "moderate": "moderate", "strong": "high"}.get(level, "moderate")


def _direction_ko(direction: str) -> str:
    return {
        "overweight": "비중 확대 고려",
        "neutral": "중립",
        "underweight": "비중 축소 고려",
    }.get(direction, direction)


def _clamp(x: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, x))


def _has_contributions(evidence: object) -> bool:
    """RegimeEvidence(pro) 이고 contributions 가 있으면 True. EvidenceLocked/None 은 False."""
    contributions = getattr(evidence, "contributions", None)
    return bool(contributions)


def _raw_value(evidence: object, ticker: str) -> float | None:
    """RegimeEvidence.contributions 에서 특정 티커의 raw_value 추출(없으면 None)."""
    contributions = getattr(evidence, "contributions", None)
    if not contributions:
        return None
    for c in contributions:
        if getattr(c, "ticker", None) == ticker:
            return getattr(c, "raw_value", None)
    return None
