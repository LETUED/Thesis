"""기업 재무 오케스트레이터 — /lab 블록의 실데이터 공급원.

소스 전략(사용자 결정):
- 한국(KR): 재무는 DART(정확), 시세 지표(PER/PBR/배당)는 yfinance.
- 미국(US): 재무+시세 모두 yfinance.
- 어느 소스도 실패하면 해당 필드는 mock 폴백(가짜가 아니라 '데모 기준값'으로 명시, source 로 가시화).

동기·차단 호출(yfinance/requests) → 라우터에서 run_in_threadpool 로 감싼다.
in-memory TTL 캐시(기본 30분). 절대 예외를 위로 던지지 않는다(부분 실패 흡수).
"""

from __future__ import annotations

import re
import threading
import time
from dataclasses import dataclass
from datetime import datetime, timezone

from app.config import settings
from app.data import dart, sec
from app.models import CompanyFundamentals

try:  # yfinance import 실패가 앱을 죽이지 않게 방어.
    import yfinance as _yf
except Exception:  # pragma: no cover
    _yf = None


@dataclass(frozen=True)
class CompanyRef:
    """기업 식별(불변) + mock 폴백 재무. id=ISIN."""

    id: str
    name: str
    ticker: str
    yahoo: str
    exchange: str
    country: str
    dart_stock_code: str | None  # KRX 6자리(미국은 None)
    aliases: tuple[str, ...]
    mock: dict[str, float | None]


# 서빙 유니버스(프론트 data.ts 와 동일 식별자). mock 은 데모 기준값(실데이터 실패 시 폴백).
UNIVERSE: tuple[CompanyRef, ...] = (
    CompanyRef(
        "KR7005930003", "삼성전자", "005930", "005930.KS", "KRX", "KR", "005930",
        ("samsung", "삼성", "삼성전자", "ss"),
        {"forward_per": 6.8, "roe": 56.6, "op_margin": 42.8, "revenue_growth": 69.0,
         "net_margin": 14.0, "pbr": 1.3, "debt_to_equity": 12.0, "dividend_yield": 2.6},
    ),
    CompanyRef(
        "KR7000660001", "SK하이닉스", "000660", "000660.KS", "KRX", "KR", "000660",
        ("sk hynix", "하이닉스", "sk", "hynix"),
        {"forward_per": 6.8, "roe": None, "op_margin": 72.0, "revenue_growth": 198.0,
         "net_margin": 30.0, "pbr": 2.1, "debt_to_equity": 38.0, "dividend_yield": 1.0},
    ),
    CompanyRef(
        "US67066G1040", "엔비디아", "NVDA", "NVDA", "NASDAQ", "US", None,
        ("nvidia", "엔비디아", "엔비"),
        {"forward_per": 22.0, "roe": 114.0, "op_margin": 60.0, "revenue_growth": 65.0,
         "net_margin": 51.0, "pbr": 28.0, "debt_to_equity": 13.0, "dividend_yield": 0.03},
    ),
    CompanyRef(
        "US11135F1012", "브로드컴", "AVGO", "AVGO", "NASDAQ", "US", None,
        ("broadcom", "브로드컴"),
        {"forward_per": 24.6, "roe": 37.3, "op_margin": 44.2, "revenue_growth": 48.0,
         "net_margin": 24.0, "pbr": 13.0, "debt_to_equity": 98.0, "dividend_yield": 1.2},
    ),
)

_FIN_KEYS = (
    "forward_per", "roe", "op_margin", "revenue_growth",
    "net_margin", "pbr", "debt_to_equity", "dividend_yield",
)
# 시세 기반 지표(전 종목 yfinance). 한국 펀더멘털은 DART 가 담당.
_PRICE_KEYS = ("forward_per", "pbr", "dividend_yield")


def _num(v: object) -> float | None:
    try:
        return None if v is None else round(float(v), 2)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return None


def _pct(v: object) -> float | None:
    """yfinance 분수(0.51) → 퍼센트(51.0)."""
    n = _num(v)
    return None if n is None else round(n * 100, 2)


def _yf_info(symbol: str) -> dict:
    if _yf is None:
        return {}
    try:
        return _yf.Ticker(symbol).info or {}
    except Exception:
        return {}


def _from_yfinance(info: dict) -> dict[str, float]:
    """yfinance .info → 지표 dict(snake_case). 값 없는 키는 생략."""
    out: dict[str, float | None] = {}
    tpe = info.get("trailingPE")
    per = _num(tpe if tpe is not None else info.get("forwardPE"))
    # 적자 기업의 음수 PER 은 표준적으로 무의미(N/A) — 극단 음수값(-2055 등) 노출 금지.
    # forwardEps 가 0 근처면 PER 절대값이 폭발하므로 양수일 때만 채운다(과신/오해 방지).
    out["forward_per"] = per if per is not None and per > 0 else None
    out["pbr"] = _num(info.get("priceToBook"))
    # yfinance 1.x 는 dividendYield 를 '퍼센트'로 반환(예: 0.69 = 0.69%). *100 금지.
    out["dividend_yield"] = _num(info.get("dividendYield"))
    out["roe"] = _pct(info.get("returnOnEquity"))
    out["op_margin"] = _pct(info.get("operatingMargins"))
    out["net_margin"] = _pct(info.get("profitMargins"))
    out["revenue_growth"] = _pct(info.get("revenueGrowth"))
    out["debt_to_equity"] = _num(info.get("debtToEquity"))
    return {k: v for k, v in out.items() if v is not None}


def collect_one(ref: CompanyRef) -> CompanyFundamentals:
    real: dict[str, float] = {}  # 실데이터로 채워진 필드만(정직성 추적용)
    sources: list[str] = []

    info = _yf_info(ref.yahoo)
    if info:
        yf = _from_yfinance(info)
        # 한국은 yfinance 에서 시세 지표만 채택(펀더멘털은 DART 가 더 정확).
        if ref.country == "KR":
            yf = {k: v for k, v in yf.items() if k in _PRICE_KEYS}
        if yf:
            real.update(yf)
            sources.append("yfinance")

    period = ""
    if ref.country == "KR" and ref.dart_stock_code and settings.dart_api_key:
        res: tuple[dict[str, float], str] | None = None
        try:
            res = dart.fetch_fundamentals(settings.dart_api_key, ref.dart_stock_code)
        except Exception:
            res = None
        if res:
            d, period = res
            real.update(d)
            sources.append("dart")

    # 실데이터 우선, 부족분만 mock 데모값으로 채우되 source 에 'mock' 을 정직히 표기.
    fields: dict[str, float | None] = {**ref.mock, **real}
    # roe 가 mock 에서도 None(데이터 미수집 정직표기)인 경우는 'mock 사용'으로 치지 않음.
    used_mock = any(
        k not in real and not (k == "roe" and ref.mock.get("roe") is None)
        for k in _FIN_KEYS
    )
    if used_mock:
        sources.append("mock")
    source = "+".join(sources) if sources else "mock"
    # partial = 실데이터로 못 채운 필드 존재(roe None 허용은 제외). 결측을 정직히 신호.
    partial = any(k not in real for k in _FIN_KEYS if k != "roe")
    return CompanyFundamentals(
        id=ref.id,
        name=ref.name,
        ticker=ref.ticker,
        yahoo=ref.yahoo,
        exchange=ref.exchange,
        country=ref.country,
        aliases=list(ref.aliases),
        forward_per=fields.get("forward_per"),
        roe=fields.get("roe"),
        op_margin=fields.get("op_margin"),
        revenue_growth=fields.get("revenue_growth"),
        net_margin=fields.get("net_margin"),
        pbr=fields.get("pbr"),
        debt_to_equity=fields.get("debt_to_equity"),
        dividend_yield=fields.get("dividend_yield"),
        source=source,
        period=period,
        asof=datetime.now(timezone.utc).isoformat(),
        partial=partial,
    )


# ── 검색 디렉토리 + 온디맨드 단일 조회 ───────────────────────────────────────
# 미국은 큐레이션(검색 노출용). 펀더멘털은 어떤 티커든 yfinance 온디맨드로 가져온다.
US_DIRECTORY: tuple[tuple[str, str], ...] = (
    ("NVDA", "엔비디아"), ("AVGO", "브로드컴"), ("AAPL", "애플"),
    ("MSFT", "마이크로소프트"), ("GOOGL", "알파벳(구글)"), ("AMZN", "아마존"),
    ("META", "메타"), ("TSLA", "테슬라"), ("TSM", "TSMC"), ("AMD", "AMD"),
    ("MU", "마이크론"), ("INTC", "인텔"), ("NFLX", "넷플릭스"),
    ("PLTR", "팔란티어"), ("ASML", "ASML"), ("QCOM", "퀄컴"),
)

_CURATED_BY_ID = {r.id: r for r in UNIVERSE}
_CURATED_BY_CODE = {r.dart_stock_code: r for r in UNIVERSE if r.dart_stock_code}
_CURATED_BY_TICKER = {r.ticker: r for r in UNIVERSE if r.country == "US"}


def search_directory(query: str, limit: int = 30) -> list[dict]:
    """검색 → [{id,name,ticker,exchange,country}]. 한국=DART 전 상장사, 미국=SEC 전 상장사.

    한글 쿼리는 한국을, 영문 쿼리는 미국을 앞에 노출(편의). 큐레이션된 4종은 기존
    id(ISIN) 로 노출(저장 캔버스 호환). 비상장사(SpaceX 등)는 어느 디렉토리에도 없다.
    """
    q = query.strip()
    if not q:
        return []
    has_hangul = bool(re.search(r"[가-힣]", q))

    kr: list[dict] = []
    if settings.dart_api_key:
        for m in dart.search_krx(settings.dart_api_key, q, limit):
            cur = _CURATED_BY_CODE.get(m["code"])
            if cur:
                kr.append({"id": cur.id, "name": cur.name, "ticker": cur.ticker,
                           "exchange": cur.exchange, "country": "KR"})
            else:
                kr.append({"id": m["code"], "name": m["name"], "ticker": m["code"],
                           "exchange": "KRX", "country": "KR"})

    us: list[dict] = []
    for m in sec.search_us(q, limit):
        cur = _CURATED_BY_TICKER.get(m["ticker"])
        if cur:
            us.append({"id": cur.id, "name": cur.name, "ticker": cur.ticker,
                       "exchange": cur.exchange, "country": "US"})
        else:
            us.append({"id": m["ticker"], "name": m["name"], "ticker": m["ticker"],
                       "exchange": "US", "country": "US"})

    ordered = (kr + us) if has_hangul else (us + kr)
    seen: set[str] = set()
    dedup: list[dict] = []
    for r in ordered:  # 큐레이트가 양쪽에 잡혀도 id 기준 1회만
        if r["id"] in seen:
            continue
        seen.add(r["id"])
        dedup.append(r)
    return dedup[:limit]


def _collect_dynamic(
    *, id: str, name: str, ticker: str, country: str, dart_code: str | None
) -> CompanyFundamentals:
    """비큐레이션 종목 온디맨드 조회(mock 폴백 없음 — 결측은 None, 정직)."""
    real: dict[str, float] = {}
    sources: list[str] = []
    yahoo = ticker
    exchange = "KRX" if country == "KR" else "US"

    info: dict = {}
    if country == "KR" and dart_code:
        for suf in (".KS", ".KQ"):  # 코스피→코스닥 폴백
            info = _yf_info(dart_code + suf)
            if info:
                yahoo = dart_code + suf
                break
    else:
        info = _yf_info(ticker)
    if info:
        ex = info.get("fullExchangeName")
        if isinstance(ex, str) and ex:
            exchange = ex
        yf = _from_yfinance(info)
        if country == "KR":
            yf = {k: v for k, v in yf.items() if k in _PRICE_KEYS}
        if yf:
            real.update(yf)
            sources.append("yfinance")

    period = ""
    if country == "KR" and dart_code and settings.dart_api_key:
        res: tuple[dict[str, float], str] | None = None
        try:
            res = dart.fetch_fundamentals(settings.dart_api_key, dart_code)
        except Exception:
            res = None
        if res:
            d, period = res
            real.update(d)
            sources.append("dart")

    source = "+".join(sources) if sources else "unavailable"
    partial = any(k not in real for k in _FIN_KEYS if k != "roe")
    return CompanyFundamentals(
        id=id, name=name, ticker=ticker, yahoo=yahoo, exchange=exchange,
        country=country, aliases=[],
        forward_per=real.get("forward_per"), roe=real.get("roe"),
        op_margin=real.get("op_margin"), revenue_growth=real.get("revenue_growth"),
        net_margin=real.get("net_margin"), pbr=real.get("pbr"),
        debt_to_equity=real.get("debt_to_equity"), dividend_yield=real.get("dividend_yield"),
        source=source, period=period,
        asof=datetime.now(timezone.utc).isoformat(), partial=partial,
    )


_one_lock = threading.Lock()
_one_cache: dict[str, tuple[float, CompanyFundamentals]] = {}


def fetch_company(id: str, *, use_cache: bool = True) -> CompanyFundamentals | None:
    """단일 종목 온디맨드 조회(id별 TTL 캐시). 알 수 없는 id 는 None."""
    if use_cache:
        with _one_lock:
            hit = _one_cache.get(id)
            if hit is not None and time.monotonic() < hit[0]:
                return hit[1].model_copy()

    cur = _CURATED_BY_ID.get(id)
    if cur is not None:
        result: CompanyFundamentals | None = collect_one(cur)
    elif id.isdigit() and len(id) == 6:  # 한국 종목코드
        nm = dart.corp_name(settings.dart_api_key, id) if settings.dart_api_key else None
        result = (
            _collect_dynamic(id=id, name=nm, ticker=id, country="KR", dart_code=id)
            if nm
            else None
        )
    elif id.replace(".", "").isalpha() and 1 <= len(id) <= 6:  # 미국 티커
        nm = next((n for t, n in US_DIRECTORY if t == id), None) or sec.us_name(id) or id
        result = _collect_dynamic(id=id, name=nm, ticker=id, country="US", dart_code=None)
    else:
        result = None

    if result is not None:
        with _one_lock:
            _one_cache[id] = (
                time.monotonic() + settings.fundamentals_cache_ttl_seconds,
                result,
            )
        return result.model_copy()
    return None


# ── in-memory TTL 캐시 ───────────────────────────────────────────────────────
_lock = threading.Lock()
_cache: tuple[float, list[CompanyFundamentals]] | None = None


def collect_companies(*, use_cache: bool = True) -> list[CompanyFundamentals]:
    """유니버스 전체 재무 수집(캐시 우선). 동기 — 라우터에서 threadpool 로 호출."""
    global _cache
    if use_cache:
        with _lock:
            if _cache is not None and time.monotonic() < _cache[0]:
                # 캐시된 가변 모델을 직접 노출하지 않도록 복사본 반환(오염 방지).
                return [m.model_copy() for m in _cache[1]]

    result = [collect_one(ref) for ref in UNIVERSE]

    with _lock:
        _cache = (time.monotonic() + settings.fundamentals_cache_ttl_seconds, result)
    return [m.model_copy() for m in result]
