import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Hero } from "@/components/landing/Hero";
import { RegimeSignalCard } from "@/components/RegimeSignalCard";
import { FinalCta } from "@/components/landing/FinalCta";
import { KoreaTriadStrip } from "@/components/glance/KoreaTriadStrip";
import type {
  MarketSnapshot,
  RegimeConclusion,
  RegimeResult,
  TickerMetric,
} from "@/lib/types";

// cycle_3 / 01·02 — 게스트 무가입 국면 결론 열람(+한국지표 맛보기·동선). 외부 오라클(렌더 결과)로 검증.
const conclusion: RegimeConclusion = {
  label: "중립",
  headline: "혼조 신호가 섞여 있어요",
  confidence: {
    level: "moderate",
    score: 0.6,
    probabilistic_label: "보통",
    rationale: "지표 간 방향이 갈립니다",
  },
  top_drivers: ["달러 약세", "변동성 진정"],
};

describe("게스트 국면 열람 (cycle_3 / 01·02)", () => {
  it("Hero 미로그인 CTA가 /regime(게스트 열람 페이지)로 연결된다", () => {
    render(<Hero regime={null} isAuthed={false} />);
    const cta = screen.getByRole("link", { name: /무료로 현재 국면 보기/ });
    expect(cta).toHaveAttribute("href", "/regime");
  });

  // 노출 경계 — pro(raw) ↔ free(locked) 대조로 마스킹을 진짜 회귀 가드로 검증.
  // (단독 free 단언은 동어반복이라, pro 에서 raw 가 실제로 노출됨을 먼저 증명해야 free 미노출이 유효.)
  it("pro evidence(raw)면 지표별 근거 블록과 comparison_text 를 노출한다", () => {
    const proRegime: RegimeResult = {
      conclusion,
      evidence: {
        score: 42,
        coverage: 0.9,
        consensus: 0.8,
        contributions: [
          {
            ticker: "DX-Y.NYB",
            display_name: "달러인덱스",
            raw_value: 103.2,
            contribution: -0.5,
            weight: 0.2,
            direction: "down",
            comparison_text: "달러인덱스 약세 — 위험자산 우호",
          },
        ],
        layer_breakdown: {},
        as_of: "2026-01-01T00:00:00Z",
      },
      disclaimer: "참고용 정보이며 매수·매도 권유가 아닙니다.",
      tier: "pro",
      cache_status: "fresh",
      generated_at: "2026-01-01T00:00:00Z",
    };
    render(<RegimeSignalCard data={proRegime} />);
    expect(screen.getByText("지표별 근거")).toBeTruthy();
    expect(screen.getByText("달러인덱스 약세 — 위험자산 우호")).toBeTruthy();
  });

  it("free(잠긴) evidence면 결론은 노출하되 Pro 원시 근거 블록은 노출하지 않는다 (노출 경계)", () => {
    const freeRegime: RegimeResult = {
      conclusion,
      // 게스트=free → 백엔드가 EvidenceLocked 로 내려줌(raw 부재)
      evidence: {
        locked: true,
        required_tier: "pro",
        preview: "지표별 기여도",
        locked_summary: ["3개 지표 근거"],
      },
      disclaimer: "참고용 정보이며 매수·매도 권유가 아닙니다.",
      tier: "free",
      cache_status: "fresh",
      generated_at: "2026-01-01T00:00:00Z",
    };
    render(<RegimeSignalCard data={freeRegime} />);

    // 결론(headline)은 무료로 노출 — 결론무료 철학
    expect(screen.getByText("혼조 신호가 섞여 있어요")).toBeTruthy();
    // Pro 전용 raw 근거 블록(위 pro 테스트에서 노출됨을 증명)이 free 에선 미노출 — 마스킹 회귀 가드
    expect(screen.queryByText("지표별 근거")).toBeNull();
  });

  it("FinalCta 미로그인 CTA도 /regime(먼저 열람)로 연결된다", () => {
    render(<FinalCta isAuthed={false} />);
    expect(
      screen.getByRole("link", { name: /무료로 현재 국면 보기/ }),
    ).toHaveAttribute("href", "/regime");
  });

  it("게스트 한국지표 맛보기는 상태만 노출하고 raw 수치는 노출하지 않는다", () => {
    const krwMetric: TickerMetric = {
      symbol: "KRW=X",
      layer: "L2",
      display_name: "원달러 환율",
      free_visible: true,
      latest: 1380,
      prev_close: 1375,
      change_pct: 0.4,
      trend: { label: "uptrend" },
      status: "ok",
      threshold_status: "warn",
      fetched_at: "2026-01-01T00:00:00Z",
      source: "yfinance",
    };
    const snapshot: MarketSnapshot = {
      generated_at: "2026-01-01T00:00:00Z",
      cache_status: "fresh",
      metrics: [krwMetric],
      foreign_flow: {
        available: false,
        source: "stub",
        market: "KOSPI",
        consecutive_sell_days: null,
        net_buy_latest_krw_eok: null,
        net_buy: null,
        series: null,
        asof: "2026-01-01",
        note: "",
      },
      failed_symbols: [],
      partial: false,
      disclaimer: "참고용 정보입니다.",
    };
    render(<KoreaTriadStrip snapshot={snapshot} />);
    // 라벨/상태는 노출
    expect(screen.getByText("원달러 환율")).toBeTruthy();
    // raw level(원달러 1380)·변동률(%) 은 미노출 — 수치 비노출 철학
    expect(screen.queryByText(/1[,.]?380/)).toBeNull();
    expect(screen.queryByText(/0\.4/)).toBeNull();
  });
});
