import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { FreshnessChip } from "@/components/dashboard/FreshnessChip";

// 신선도 고지(설계철학5): stale 은 '최신이 아닐 수 있음'을 색이 아닌 라벨로 정직하게 알린다.
// /allocation·/dashboard·/indicators 에서 공유하는 단일 표기 컴포넌트의 회귀 보호.

describe("FreshnessChip — 데이터 신선도 표기", () => {
  it("stale 이면 갱신 지연을 라벨 텍스트로 고지한다", () => {
    const { getByText } = render(<FreshnessChip cacheStatus="stale" />);
    expect(getByText(/갱신 지연/)).toBeInTheDocument();
    expect(getByText(/최신이 아닐 수 있어요/)).toBeInTheDocument();
  });

  it("fresh 면 정상(주기 갱신)으로 표기하고 과신 톤('실시간')을 쓰지 않는다", () => {
    const { getByText, queryByText } = render(
      <FreshnessChip cacheStatus="fresh" />,
    );
    expect(getByText(/최대 30분 캐시/)).toBeInTheDocument();
    expect(queryByText(/갱신 지연/)).toBeNull();
    expect(queryByText(/실시간/)).toBeNull();
  });

  it("cached 는 stale 이 아니다(만료 전 캐시 = 정상 신선도)", () => {
    const { getByText, queryByText } = render(
      <FreshnessChip cacheStatus="cached" />,
    );
    expect(getByText(/최대 30분 캐시/)).toBeInTheDocument(); // 양성 단언
    expect(queryByText(/갱신 지연/)).toBeNull();
  });

  it("stale 이고 generatedAt 이 있으면 데이터 시각(Asia/Seoul)을 병기한다", () => {
    // 2026-06-24T05:30:00Z = KST 14:30
    const { getByText } = render(
      <FreshnessChip cacheStatus="stale" generatedAt="2026-06-24T05:30:00Z" />,
    );
    expect(getByText(/14:30 기준/)).toBeInTheDocument();
    expect(getByText(/최신이 아닐 수 있어요/)).toBeInTheDocument();
  });

  it("fresh 면 generatedAt 이 있어도 시각을 노출하지 않는다(stale 만)", () => {
    const { queryByText } = render(
      <FreshnessChip cacheStatus="fresh" generatedAt="2026-06-24T05:30:00Z" />,
    );
    expect(queryByText(/기준/)).toBeNull();
  });

  it("색 단독 의미전달 금지 — 색 점은 aria-hidden, 의미는 라벨이 전달한다", () => {
    const { container, getByText } = render(
      <FreshnessChip cacheStatus="stale" />,
    );
    const dot = container.querySelector("span[aria-hidden]");
    expect(dot).toBeInTheDocument(); // 점은 스크린리더에 숨김
    expect(getByText(/갱신 지연/)).toBeInTheDocument(); // 의미는 텍스트로 병기
  });
});
