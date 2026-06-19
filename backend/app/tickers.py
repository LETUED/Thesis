"""16티커 → 레이어/한글명 매핑 (단일 소스).

collector/regime 모듈은 이 모듈의 TICKER_SPECS 만 참조한다.
티커 추가·삭제는 여기 한 곳만 고치면 끝난다(관심사 분리).

Top-Down 철학(매크로→자산배분→기업분석)을 코드 레벨에서 강제하기 위해
Layer enum 을 정렬 키로 쓴다(L1<L2<L3<L4).
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


class Layer(str, Enum):
    """티커가 속한 5레이어. 값(L1~L4) 오름차순 = Top-Down 표시 순서."""

    GLOBAL_MACRO = "L1"  # 글로벌 매크로
    KR_MACRO = "L2"  # 한국 매크로 (철학7: 최우선 가중 대상)
    RISK_COMMODITY = "L3"  # 위험선호 / 원자재
    SECTOR_STOCK = "L4"  # 섹터 / 기업

    @property
    def label_ko(self) -> str:
        return _LAYER_LABELS_KO[self]


_LAYER_LABELS_KO: dict[Layer, str] = {
    Layer.GLOBAL_MACRO: "글로벌 매크로",
    Layer.KR_MACRO: "한국 매크로",
    Layer.RISK_COMMODITY: "위험선호·원자재",
    Layer.SECTOR_STOCK: "섹터·기업",
}


@dataclass(frozen=True)
class TickerSpec:
    """티커 1개의 정적 메타.

    Attributes:
        symbol: yfinance 심볼.
        layer: 소속 레이어.
        display_name: 한국어 표시명.
        free_visible: 무료 플랜에서 원시 수치까지 노출할지(원달러·VIX·코스피=True).
        invert: 의미상 값 반전이 필요한지(현재 전부 False, 확장 여지).
    """

    symbol: str
    layer: Layer
    display_name: str
    free_visible: bool = False
    invert: bool = False


# 16티커 단일 소스. 이 리스트가 수집 대상의 진실.
TICKER_SPECS: tuple[TickerSpec, ...] = (
    # L1 글로벌 매크로
    TickerSpec("^VIX", Layer.GLOBAL_MACRO, "변동성지수(VIX)", free_visible=True),
    TickerSpec("DX-Y.NYB", Layer.GLOBAL_MACRO, "달러인덱스(DXY)"),
    TickerSpec("^TNX", Layer.GLOBAL_MACRO, "미 10년물 금리"),
    TickerSpec("^IRX", Layer.GLOBAL_MACRO, "미 13주 금리(연준 proxy)"),
    # L2 한국 매크로 (최우선)
    TickerSpec("KRW=X", Layer.KR_MACRO, "원달러 환율", free_visible=True),
    TickerSpec("^KS11", Layer.KR_MACRO, "코스피", free_visible=True),
    TickerSpec("^KQ11", Layer.KR_MACRO, "코스닥"),
    # L3 위험선호 / 원자재
    TickerSpec("^GSPC", Layer.RISK_COMMODITY, "S&P500"),
    TickerSpec("^IXIC", Layer.RISK_COMMODITY, "나스닥"),
    TickerSpec("GC=F", Layer.RISK_COMMODITY, "금"),
    TickerSpec("CL=F", Layer.RISK_COMMODITY, "WTI 원유"),
    TickerSpec("BTC-USD", Layer.RISK_COMMODITY, "비트코인"),
    # L4 섹터 / 기업
    TickerSpec("NVDA", Layer.SECTOR_STOCK, "엔비디아"),
    TickerSpec("AVGO", Layer.SECTOR_STOCK, "브로드컴"),
    TickerSpec("005930.KS", Layer.SECTOR_STOCK, "삼성전자"),
    TickerSpec("000660.KS", Layer.SECTOR_STOCK, "SK하이닉스"),
)


_BY_SYMBOL: dict[str, TickerSpec] = {s.symbol: s for s in TICKER_SPECS}


def get_spec(symbol: str) -> TickerSpec | None:
    """심볼로 스펙 조회. 없으면 None."""
    return _BY_SYMBOL.get(symbol)


def specs_for_layers(layers: list[Layer] | None = None) -> list[TickerSpec]:
    """레이어 필터링된 스펙을 Top-Down(레이어 오름차순)으로 반환."""
    selected = TICKER_SPECS if layers is None else tuple(
        s for s in TICKER_SPECS if s.layer in set(layers)
    )
    return sorted(selected, key=lambda s: s.layer.value)
