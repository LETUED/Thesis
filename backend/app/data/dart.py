"""OPEN DART(전자공시) 한국 기업 재무 어댑터.

설계 계약(철학7 정직성):
- 키 미설정/네트워크 실패/빈응답이면 가짜 숫자를 만들지 않고 None 을 반환한다.
- corpCode 매핑(종목코드→고유번호)은 .cache 에 1회 다운로드 후 재사용(대용량 ZIP).
- 표준계정(account_id, IFRS) 우선 매칭, 실패 시 한글 계정명으로 폴백.

DART는 시세를 제공하지 않는다(공시 재무만) — PER/PBR/배당은 호출자가 yfinance 로 보완.
"""

from __future__ import annotations

import io
import json
import os
import threading
import zipfile
from datetime import datetime
from xml.etree import ElementTree as ET

import requests

from app.config import settings

_BASE = "https://opendart.fss.or.kr/api"
_TIMEOUT = 15.0
_CORP_CACHE = os.path.join(settings.foreign_flow_cache_dir, "dart_corpcodes.json")
# 상장사 디렉토리(코드+고유번호+이름). corpCode.xml 1회 파싱 후 캐시.
_DIR_CACHE = os.path.join(settings.foreign_flow_cache_dir, "dart_directory.json")
_dir_lock = threading.Lock()
_dir_mem: list[dict] | None = None

# 표준계정 account_id(IFRS) — 연결재무제표 표준 키.
_ACCT_ID: dict[str, tuple[str, ...]] = {
    "revenue": (
        "ifrs-full_Revenue",
        "ifrs-full_RevenueFromContractsWithCustomers",  # K-IFRS 1115(고객과의 계약 수익)
        "ifrs_Revenue",
    ),
    "operating_income": ("dart_OperatingIncomeLoss", "ifrs-full_OperatingIncomeLoss"),
    "net_income": ("ifrs-full_ProfitLoss", "ifrs_ProfitLoss"),
    "equity": ("ifrs-full_Equity", "ifrs_Equity"),
    "liabilities": ("ifrs-full_Liabilities", "ifrs_Liabilities"),
}
# 한글 계정명 폴백(account_id 미매칭 시) — '정확일치'만 사용(부분일치는 '자본총계'가
# '지배기업…자본총계' 같은 하위 행을 오매칭하므로 금지).
_ACCT_NM: dict[str, tuple[str, ...]] = {
    "revenue": ("매출액", "수익(매출액)", "영업수익"),
    "operating_income": ("영업이익", "영업이익(손실)"),
    "net_income": ("당기순이익", "당기순이익(손실)"),
    "equity": ("자본총계",),
    "liabilities": ("부채총계",),
}
# 항목별 재무제표 구분(sj_div) — 손익은 IS/CIS, 재무상태표는 BS 로 한정(교차 오매칭 방지).
_ACCT_SJ: dict[str, tuple[str, ...]] = {
    "revenue": ("IS", "CIS"),
    "operating_income": ("IS", "CIS"),
    "net_income": ("IS", "CIS"),
    "equity": ("BS",),
    "liabilities": ("BS",),
}


def _parse_amount(raw: str | None) -> float | None:
    if raw is None:
        return None
    s = raw.replace(",", "").strip()
    if s in ("", "-"):
        return None
    try:
        return float(s)
    except ValueError:
        return None


def _amount(items: list[dict], key: str, field: str) -> float | None:
    """해당 재무제표(sj_div) 안에서 account_id 우선, 없으면 한글 계정명 '정확일치'로 추출.

    field=thstrm_amount(당기)/frmtrm_amount(전기). sj_div 로 BS/IS/CIS 를 한정해
    동일 account_id 가 여러 표에 중복되거나 하위 항목이 오매칭되는 것을 막는다.
    """
    ids = _ACCT_ID[key]
    nms = _ACCT_NM[key]
    sjs = _ACCT_SJ[key]
    for it in items:
        if it.get("sj_div") in sjs and it.get("account_id") in ids:
            return _parse_amount(it.get(field))
    for it in items:  # 폴백: 정확일치만(부분일치 금지)
        if it.get("sj_div") in sjs and (it.get("account_nm") or "").strip() in nms:
            return _parse_amount(it.get(field))
    return None


def _load_directory(api_key: str) -> list[dict]:
    """상장사 디렉토리 [{code, corp, name}]. 메모리→파일캐시→corpCode.xml 다운로드 순."""
    global _dir_mem
    if _dir_mem is not None:
        return _dir_mem
    with _dir_lock:
        if _dir_mem is not None:
            return _dir_mem
        try:
            if os.path.exists(_DIR_CACHE):
                with open(_DIR_CACHE, encoding="utf-8") as f:
                    cached = json.load(f)
                if isinstance(cached, list) and cached:
                    _dir_mem = cached
                    return _dir_mem
        except Exception:
            pass
        if not api_key:
            return []
        resp = requests.get(
            f"{_BASE}/corpCode.xml", params={"crtfc_key": api_key}, timeout=_TIMEOUT
        )
        resp.raise_for_status()
        with zipfile.ZipFile(io.BytesIO(resp.content)) as zf:
            xml_bytes = zf.read(zf.namelist()[0])
        root = ET.fromstring(xml_bytes)
        out: list[dict] = []
        for item in root.iter("list"):
            code = (item.findtext("stock_code") or "").strip()
            corp = (item.findtext("corp_code") or "").strip()
            name = (item.findtext("corp_name") or "").strip()
            if code and corp:  # 상장사만(stock_code 있는 것)
                out.append({"code": code, "corp": corp, "name": name})
        try:
            os.makedirs(settings.foreign_flow_cache_dir, exist_ok=True)
            with open(_DIR_CACHE, "w", encoding="utf-8") as f:
                json.dump(out, f, ensure_ascii=False)
        except Exception:
            pass
        _dir_mem = out
        return out


def _load_corp_map(api_key: str) -> dict[str, str]:
    """종목코드(6자리) → DART 고유번호(corp_code) 매핑."""
    return {d["code"]: d["corp"] for d in _load_directory(api_key)}


def corp_name(api_key: str, code: str) -> str | None:
    """종목코드 → 회사명."""
    for d in _load_directory(api_key):
        if d["code"] == code:
            return d["name"]
    return None


def search_krx(api_key: str, query: str, limit: int = 30) -> list[dict]:
    """한국 상장사 검색 → [{code, name}]. 이름/코드 관련도순(정확>시작>부분)."""
    q = query.strip().lower()
    if not q:
        return []
    scored: list[tuple[int, dict]] = []
    for d in _load_directory(api_key):
        name = d["name"].lower()
        code = d["code"]
        if name == q or code == q:
            s = 100
        elif name.startswith(q) or code.startswith(q):
            s = 80
        elif q in name:
            s = 60
        else:
            continue
        scored.append((s, d))
    scored.sort(key=lambda x: (-x[0], x[1]["name"]))
    return [{"code": d["code"], "name": d["name"]} for _, d in scored[:limit]]


# 보고서 코드. 후보는 period-end 내림차순으로: 연간(Dec)>3분기(Sep)>반기(Jun)>1분기(Mar).
_REPRT_ANNUAL = "11011"
_REPRT_ORDER = ("11011", "11014", "11012", "11013")
_REPRT_LABEL = {
    "11011": "사업보고서",
    "11014": "3분기",
    "11012": "반기",
    "11013": "1분기",
}


def _fetch_statements(
    api_key: str, corp_code: str, year: int, reprt_code: str, fs_div: str
) -> list[dict] | None:
    """전체 재무제표(fnlttSinglAcntAll) 조회. status!=000 이면 None."""
    resp = requests.get(
        f"{_BASE}/fnlttSinglAcntAll.json",
        params={
            "crtfc_key": api_key,
            "corp_code": corp_code,
            "bsns_year": str(year),
            "reprt_code": reprt_code,
            "fs_div": fs_div,  # CFS 연결 / OFS 별도
        },
        timeout=_TIMEOUT,
    )
    resp.raise_for_status()
    data = resp.json()
    if data.get("status") != "000":
        return None
    items = data.get("list")
    return items if isinstance(items, list) and items else None


def _statements_for(
    api_key: str, corp_code: str, year: int, reprt_code: str
) -> list[dict] | None:
    """연결(CFS) 우선, 별도(OFS) 폴백."""
    for fs in ("CFS", "OFS"):
        try:
            it = _fetch_statements(api_key, corp_code, year, reprt_code, fs)
        except Exception:
            it = None
        if it:
            return it
    return None


def fetch_fundamentals(
    api_key: str, stock_code: str
) -> tuple[dict[str, float], str] | None:
    """종목코드(예: '005930') → DART 재무 기반 지표 dict(snake_case). 실패 시 None.

    최신 보고서(분기 우선, 없으면 연간)를 자동 선택. 분기는 thstrm_amount 가
    '당해 3개월' 단일값이라:
      - 마진(영업/순)은 당분기 비율(그대로),
      - ROE 는 당분기 순이익을 ×4 연환산해 자본총계 대비,
      - 매출성장률은 전년 '동분기' 보고서를 따로 받아 YoY,
      - 부채비율은 분기말 BS(시점값) 그대로.
    연간 보고서면 연환산 없이 그대로, 성장률은 frmtrm(전년 전체)으로 산출.
    반환 키(있는 것만): roe, op_margin, net_margin, revenue_growth, debt_to_equity.
    PER/PBR/배당은 시세가 필요하므로 여기서 산출하지 않는다.
    """
    if not api_key:
        return None
    try:
        corp_map = _load_corp_map(api_key)
    except Exception:
        return None
    corp_code = corp_map.get(stock_code)
    if not corp_code:
        return None

    # 최신 보고서 탐색(period-end 내림차순). 첫 데이터 = 가장 최신 공시.
    items: list[dict] | None = None
    got_year: int | None = None
    got_reprt: str | None = None
    year = datetime.now().year
    for y in (year, year - 1, year - 2):
        for rc in _REPRT_ORDER:
            it = _statements_for(api_key, corp_code, y, rc)
            if it:
                items, got_year, got_reprt = it, y, rc
                break
        if items:
            break
    if not items or got_year is None or got_reprt is None:
        return None

    # ⚠️ 라이브 검증(삼성 005930, 2025): IS 의 thstrm_amount 는 '당분기 3개월 단일값'이다.
    #   반기 thstrm=Q2(74.6조), 3분기 thstrm=Q3(86.1조). 누적은 thstrm_add_amount(반기 153.7조).
    #   따라서 모든 분기 ×4 연환산이 맞다(반기 ×2/3분기 ×4÷3 으로 '고치면' 틀림 — 누적이 아님).
    is_annual = got_reprt == _REPRT_ANNUAL
    revenue = _amount(items, "revenue", "thstrm_amount")
    op = _amount(items, "operating_income", "thstrm_amount")
    ni = _amount(items, "net_income", "thstrm_amount")
    equity = _amount(items, "equity", "thstrm_amount")
    liab = _amount(items, "liabilities", "thstrm_amount")

    out: dict[str, float] = {}
    if revenue and op is not None:
        out["op_margin"] = round(op / revenue * 100, 2)
    if revenue and ni is not None:
        out["net_margin"] = round(ni / revenue * 100, 2)
    if equity and ni is not None:
        factor = 1.0 if is_annual else 4.0  # 분기 단일(3개월) 순이익 → 연환산
        out["roe"] = round(ni * factor / equity * 100, 2)
    if equity and liab is not None:
        out["debt_to_equity"] = round(liab / equity * 100, 1)

    # 매출성장률 YoY: 연간은 frmtrm(전년 전체), 분기는 전년 동분기 보고서를 따로.
    rev_prev: float | None = None
    if is_annual:
        rev_prev = _amount(items, "revenue", "frmtrm_amount")
    else:
        prior = _statements_for(api_key, corp_code, got_year - 1, got_reprt)
        if prior:
            rev_prev = _amount(prior, "revenue", "thstrm_amount")
    if revenue is not None and rev_prev and rev_prev > 0:
        out["revenue_growth"] = round((revenue - rev_prev) / rev_prev * 100, 1)

    if not out:
        return None
    period = f"{got_year} {_REPRT_LABEL.get(got_reprt, '')}".strip()
    return out, period
