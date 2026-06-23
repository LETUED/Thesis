import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { BlurTeaser } from "@/components/ui/blur-teaser";
import { LockedValue } from "@/components/ui/locked-value";
import { LockedCard } from "@/components/paywall/LockedCard";

// (c) Pro 잠금 표현에 실제 raw 수치가 DOM 텍스트로 새지 않음을 보장한다.
// 핵심 계약(약화 금지): 흐림/잠금 영역은 글리프·형태만 노출하고 raw 숫자는 노출하지 않는다.

describe("BlurTeaser — 흐림부 차단 + SR 의미 전달 + raw 부재", () => {
  it("흐림 대상 children 은 aria-hidden + 포인터 차단으로 감싼다", () => {
    const { container } = render(
      <BlurTeaser label="이 판단의 근거 지표 보기">
        <span>•••</span>
        <span>▇▇▇</span>
      </BlurTeaser>,
    );
    const hidden = container.querySelector('[aria-hidden="true"]');
    expect(hidden).toBeInTheDocument();
    expect(hidden).toHaveClass("blur-sm");
    expect(hidden).toHaveClass("pointer-events-none");
  });

  it("스크린리더용 'Pro 잠금' 의미 텍스트를 제공한다", () => {
    const { getByText } = render(
      <BlurTeaser label="이 판단의 근거 지표 보기" summary={["가려진 지표 형태"]}>
        <span>•••</span>
      </BlurTeaser>,
    );
    const sr = getByText(/Pro 잠금/);
    expect(sr).toBeInTheDocument();
    expect(sr).toHaveClass("sr-only");
  });

  it("글리프만 담은 children + 형태 요약일 때 DOM 텍스트에 raw 숫자가 없다", () => {
    const { container } = render(
      <BlurTeaser
        label="자산배분 산출 근거 보기"
        summary={["가려진 비중 막대 형태", "단계별 근거 목록"]}
      >
        {/* 형태만 — 글리프/막대(raw 값 금지) */}
        <div>
          <span>•••</span>
          <span>▇▇▇▇</span>
          <span>██░░</span>
        </div>
      </BlurTeaser>,
    );
    expect(container.textContent ?? "").not.toMatch(/\d/);
  });
});

describe("LockedValue — 가짜 숫자 대신 글리프/방향만", () => {
  it("방향 없는 잠금값은 ••• 글리프만, 숫자 없음", () => {
    const { container, getByRole } = render(<LockedValue label="원달러" />);
    const text = container.textContent ?? "";
    expect(text).toContain("•••");
    expect(text).not.toMatch(/\d/);
    // role=img + aria-label 로 의미만 전달(시각적 raw 값 아님).
    expect(getByRole("img")).toHaveAttribute("aria-label", "원달러 Pro 잠금");
  });

  it("방향(up/down)은 숫자 대신 화살표 글리프 + SR 방향 텍스트로만 표현", () => {
    const up = render(<LockedValue label="VIX" dir="up" />);
    expect(up.container.textContent ?? "").toContain("↑");
    expect(up.container.textContent ?? "").not.toMatch(/\d/);
    expect(up.getByText(/방향 상승/)).toHaveClass("sr-only");

    const down = render(<LockedValue label="VIX" dir="down" />);
    expect(down.container.textContent ?? "").toContain("↓");
    expect(down.container.textContent ?? "").not.toMatch(/\d/);
    expect(down.getByText(/방향 하락/)).toHaveClass("sr-only");
  });
});

describe("LockedCard — card/blur 모드 모두 raw 숫자 부재", () => {
  it("card 모드: 형태 요약(글리프)만, raw 숫자 없음", () => {
    // evidence_regime 카피는 숫자가 없다 — 형태 요약만 넣어 raw 부재를 단언.
    // (indicators_detail 등 일부 업셀 '카피'에는 '3개' 같은 마케팅 숫자가 있으나
    //  이는 데이터 raw 값이 아니라 안내 문구다. 여기선 잠금 표현 자체의 raw 부재를 본다.)
    const { container } = render(
      <LockedCard
        mode="card"
        source="evidence_regime"
        summary={["가려진 지표 행 형태", "추세 막대 형태"]}
      />,
    );
    expect(container.textContent ?? "").not.toMatch(/\d/);
  });

  it("blur 모드: 글리프 children + 형태 요약, raw 숫자 없음", () => {
    const { container } = render(
      <LockedCard
        mode="blur"
        source="evidence_regime"
        summary={["가려진 기여도 막대 형태"]}
      >
        <div>
          <span>•••</span>
          <span>▇▇▇</span>
        </div>
      </LockedCard>,
    );
    expect(container.textContent ?? "").not.toMatch(/\d/);
  });
});
