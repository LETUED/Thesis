"""SEC EDGAR 미국 상장사 디렉토리 어댑터(검색 전용).

DART corpCode 의 미국 대칭. company_tickers.json(전 미국 상장사 ticker+회사명)을
1회 다운로드·캐시 후 검색에 사용한다. 재무는 여기서 산출하지 않는다(호출자가 yfinance).

SEC 정책: 자동화 요청은 식별 가능한 User-Agent 헤더가 필요하다(없으면 차단).
  https://www.sec.gov/os/webmaster-faq#developers
비상장사(예: SpaceX)는 거래 티커가 없어 이 디렉토리에 존재하지 않는다.
"""

from __future__ import annotations

import json
import os
import threading

import requests

from app.config import settings

_URL = "https://www.sec.gov/files/company_tickers.json"
_TIMEOUT = 15.0
_DIR_CACHE = os.path.join(settings.foreign_flow_cache_dir, "sec_tickers.json")
_lock = threading.Lock()
_mem: list[dict] | None = None


def _load_directory() -> list[dict]:
    """미국 상장사 [{ticker, name, cik}]. 메모리→파일캐시→SEC 다운로드 순. 실패 시 []."""
    global _mem
    if _mem is not None:
        return _mem
    with _lock:
        if _mem is not None:
            return _mem
        try:
            if os.path.exists(_DIR_CACHE):
                with open(_DIR_CACHE, encoding="utf-8") as f:
                    cached = json.load(f)
                if isinstance(cached, list) and cached:
                    _mem = cached
                    return _mem
        except Exception:
            pass
        try:
            resp = requests.get(
                _URL,
                headers={"User-Agent": settings.sec_user_agent},
                timeout=_TIMEOUT,
            )
            resp.raise_for_status()
            data = resp.json()
        except Exception:
            return []
        # 형식: {"0":{"cik_str":320193,"ticker":"AAPL","title":"Apple Inc."}, ...}
        rows = data.values() if isinstance(data, dict) else data
        out: list[dict] = []
        for r in rows:
            if not isinstance(r, dict):
                continue
            ticker = str(r.get("ticker") or "").strip().upper()
            name = str(r.get("title") or "").strip()
            if ticker and name:
                out.append({"ticker": ticker, "name": name, "cik": r.get("cik_str")})
        try:
            os.makedirs(settings.foreign_flow_cache_dir, exist_ok=True)
            with open(_DIR_CACHE, "w", encoding="utf-8") as f:
                json.dump(out, f, ensure_ascii=False)
        except Exception:
            pass
        _mem = out
        return out


def us_name(ticker: str) -> str | None:
    """티커 → 회사명(영문)."""
    t = ticker.strip().upper()
    for d in _load_directory():
        if d["ticker"] == t:
            return d["name"]
    return None


# 통칭(브랜드명)이 정식 회사명과 달라 일반 매칭으로 안 잡히는 유명 종목 보강.
# 예: "spacex" → 정식명 "Space Exploration Technologies Corp"(공백·어순 불일치).
_BRAND_ALIASES: dict[str, str] = {
    "spacex": "SPCX",
    "스페이스엑스": "SPCX",
    "스페이스x": "SPCX",
    "google": "GOOGL",
    "구글": "GOOGL",
    "alphabet": "GOOGL",
    "facebook": "META",
    "meta": "META",
    "berkshire": "BRK-B",
    "berkshirehathaway": "BRK-B",
}


def search_us(query: str, limit: int = 30) -> list[dict]:
    """미국 상장사 검색 → [{ticker, name, cik}]. 티커/이름 관련도순(정확>시작>부분).

    동점이면 짧은 티커 우선(AAPL 이 'apple' 부분일치한 잡종목보다 먼저 오게).
    통칭(SpaceX 등)은 별칭으로 정식명 종목을 최우선 노출.
    """
    q = query.strip().lower()
    if not q:
        return []
    alias_ticker = _BRAND_ALIASES.get(q.replace(" ", ""))
    scored: list[tuple[int, dict]] = []
    for d in _load_directory():
        ticker = d["ticker"].lower()
        name = d["name"].lower()
        if alias_ticker and d["ticker"] == alias_ticker:
            s = 120  # 통칭 별칭 최우선
        elif ticker == q or name == q:
            s = 100
        elif ticker.startswith(q) or name.startswith(q):
            s = 80
        elif q in ticker or q in name:
            s = 60
        else:
            continue
        scored.append((s, d))
    # 동점이면 짧은 티커 → 짧은 회사명(대표 정식명이 보통 짧다) → 알파벳순.
    scored.sort(
        key=lambda x: (-x[0], len(x[1]["ticker"]), len(x[1]["name"]), x[1]["name"])
    )
    return [
        {"ticker": d["ticker"], "name": d["name"], "cik": d["cik"]}
        for _, d in scored[:limit]
    ]
