"""외국인 순매수 실데이터 어댑터 — pykrx 옵셔널 + 정직한 폴백(철학7).

설계 배경(2026-06 검증):
- KRX 익명 API 는 차단됨. pykrx 1.2.8 은 KRX 회원계정(환경변수 KRX_ID/KRX_PW)으로
  로그인해야만 데이터를 준다. 미설정/import실패/빈응답이면 가짜 숫자를 만들지 않고
  available=False 스텁으로 graceful degrade 한다.
- pykrx import 자체가 stdout 에 '로그인 실패' 메시지를 출력 → import 를 함수 내부로
  지연시키고 stdout 을 임시 억제한다(로그 오염 방지).
- 외국인 순매수는 일단위 데이터라 일1회 파일캐시(JSON, asof.date()==today 면 재사용)로
  충분하다. 호출은 동기·차단·로그인세션 필요 → 라우터에서 run_in_threadpool 로 감싼다.

순수 판정 함수 compute_sell_streak 는 외부의존 없이 단위테스트 가능하게 분리한다.
"""

from __future__ import annotations

import contextlib
import io
import json
import os
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

from app.config import settings
from app.models import ForeignFlowReading, now_utc

__all__ = [
    "compute_sell_streak",
    "fetch_foreign_flow",
]


# ── 순수 판정 함수 ───────────────────────────────────────────────────────────


def compute_sell_streak(daily_net_buy: list[float]) -> int:
    """최신일이 리스트의 마지막이라고 가정하고, 역순으로 순매도(net<0) 연속일을 센다.

    0 은 순매수도 순매도도 아닌 경계 → 연속이 끊긴 것으로 본다(보수적).
    빈 리스트면 0. 가짜 숫자 금지: 결측을 음수로 오인하지 않도록 호출자가
    None 을 걸러 넣어야 한다.
    """
    streak = 0
    for value in reversed(daily_net_buy):
        if value is None:
            break
        if value < 0:
            streak += 1
        else:
            break
    return streak


# ── 파일 캐시 ────────────────────────────────────────────────────────────────


def _cache_path(market: str) -> Path:
    base = Path(settings.foreign_flow_cache_dir)
    safe = "".join(c for c in market if c.isalnum() or c in ("_", "-")) or "market"
    return base / f"foreign_flow_{safe}.json"


def _load_cache(market: str) -> ForeignFlowReading | None:
    path = _cache_path(market)
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, ValueError, OSError):
        return None
    try:
        return ForeignFlowReading.model_validate(raw)
    except Exception:
        return None


def _is_fresh_today(reading: ForeignFlowReading) -> bool:
    asof = reading.asof
    if asof.tzinfo is None:
        asof = asof.replace(tzinfo=timezone.utc)
    return asof.date() == datetime.now(timezone.utc).date()


def _save_cache(reading: ForeignFlowReading) -> None:
    path = _cache_path(reading.market)
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(
            reading.model_dump_json(indent=2), encoding="utf-8"
        )
    except OSError:
        # 캐시 저장 실패는 치명적 아님 — 데이터는 이미 반환 가능.
        pass


# ── 스텁(미수집) 폴백 ────────────────────────────────────────────────────────


def _stub(market: str, note: str) -> ForeignFlowReading:
    return ForeignFlowReading(
        available=False,
        source="stub",
        market=market,
        consecutive_sell_days=None,
        net_buy_latest_krw_eok=None,
        net_buy=None,
        series=None,
        asof=now_utc(),
        note=note,
    )


# ── pykrx 호출(자격증명 필요) ────────────────────────────────────────────────


def _has_credentials() -> bool:
    return bool(os.environ.get("KRX_ID")) and bool(os.environ.get("KRX_PW"))


def _fetch_series_via_pykrx(
    market: str, lookback_days: int
) -> list[tuple[str, float]]:
    """pykrx 로 일별 외국인 순매수(억원) 시계열을 가져온다.

    get_market_trading_value_by_date(fromdate, todate, ticker=market) 는 일자별
    투자자별 거래대금(원)을 반환한다. '외국인' 컬럼을 억원으로 환산한다.
    실패/빈응답이면 빈 리스트를 반환(호출자가 stub 폴백).

    pykrx import 가 stdout 에 로그인실패 메시지를 출력하므로 억제한다.
    """
    today = date.today()
    fromdate = (today - timedelta(days=lookback_days)).strftime("%Y%m%d")
    todate = today.strftime("%Y%m%d")

    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        try:
            from pykrx import stock  # 지연 import (로그 오염/무거운 의존 방어)
        except Exception:
            return []
        try:
            df = stock.get_market_trading_value_by_date(fromdate, todate, market)
        except Exception:
            return []

    if df is None or getattr(df, "empty", True):
        return []

    # 외국인 컬럼 후보(pykrx 버전/표기 차이 방어).
    col = None
    for candidate in ("외국인합계", "외국인"):
        if candidate in df.columns:
            col = candidate
            break
    if col is None:
        return []

    series: list[tuple[str, float]] = []
    for idx, value in df[col].items():
        if value != value:  # NaN
            continue
        # 인덱스가 Timestamp 면 ISO 날짜로, 아니면 문자열화.
        try:
            iso = idx.date().isoformat()
        except AttributeError:
            iso = str(idx)
        series.append((iso, float(value) / 1e8))  # 원 → 억원
    return series


# ── 공개 진입점 ──────────────────────────────────────────────────────────────


def fetch_foreign_flow(
    market: str | None = None,
    lookback_days: int | None = None,
    *,
    use_cache: bool = True,
) -> ForeignFlowReading:
    """외국인 순매수 관측치를 반환. 실패 시 정직하게 available=False 스텁 폴백.

    흐름:
      1) foreign_flow_enabled=False → 영구 스텁(기능 비활성).
      2) use_cache 이고 오늘자 캐시가 신선하면 그대로 반환(일1회 캐시).
      3) 자격증명(KRX_ID/KRX_PW) 없으면 스텁(가짜 숫자 금지).
      4) pykrx 조회 성공 → ForeignFlowReading(available=True) 구성·캐시 저장.
      5) 조회 실패 → 직전 캐시(stale, 있으면) 또는 스텁 폴백.
    """
    market = market or settings.foreign_flow_market
    lookback_days = lookback_days or settings.foreign_flow_lookback_days

    if not settings.foreign_flow_enabled:
        return _stub(market, "외국인 순매수 수집 비활성(foreign_flow_enabled=False)")

    if use_cache:
        cached = _load_cache(market)
        if cached is not None and _is_fresh_today(cached):
            return cached

    if not _has_credentials():
        return _stub(
            market,
            "외국인 순매수 데이터 미수집 — KRX 회원계정(KRX_ID/KRX_PW) 미설정",
        )

    series = _fetch_series_via_pykrx(market, lookback_days)
    if not series:
        # 조회 실패: 직전 캐시(stale)라도 있으면 정직하게 그걸, 없으면 스텁.
        stale = _load_cache(market) if use_cache else None
        if stale is not None and stale.available:
            return stale
        return _stub(
            market,
            "외국인 순매수 조회 실패(KRX 응답 없음) — 자격증명/세션 확인 필요",
        )

    series.sort(key=lambda kv: kv[0])  # 날짜 오름차순(최신=마지막)
    net_values = [v for _, v in series]
    streak = compute_sell_streak(net_values)
    latest = net_values[-1]

    reading = ForeignFlowReading(
        available=True,
        source="pykrx",
        market=market,
        consecutive_sell_days=streak,
        net_buy_latest_krw_eok=round(latest, 2),
        net_buy=round(latest, 2),
        series=series,
        asof=now_utc(),
        note=(
            f"외국인 순매수 실데이터(pykrx) — 최근 {len(series)}영업일, "
            f"연속 순매도 {streak}일"
        ),
    )
    if use_cache:
        _save_cache(reading)
    return reading
