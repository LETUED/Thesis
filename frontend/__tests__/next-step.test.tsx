import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { NextStep } from "@/components/glance/NextStep";

// Top-Down 단계 안내(설계철학2). dashboard(시작점)는 next 만, 중간 페이지는 prev/next 둘 다.
// 조건부 렌더 회귀 보호: 둘 다 없으면 아무것도 그리지 않아 빈 자리를 남기지 않는다.

describe("NextStep — Top-Down 단계 안내", () => {
  it("next 만 주면 다음 단계 링크만 보인다(흐름 시작점)", () => {
    const { getByText } = render(
      <NextStep
        nextHref="/allocation"
        nextLabel="자산배분 보기"
        reason="국면을 확인했다면 비율로 이어집니다."
      />,
    );
    expect(getByText("자산배분 보기")).toBeInTheDocument();
    expect(getByText(/비율로 이어집니다/)).toBeInTheDocument();
  });

  it("prev/next 모두 없으면 아무것도 렌더하지 않는다", () => {
    const { container } = render(<NextStep />);
    expect(container).toBeEmptyDOMElement();
  });

  it("prevHref 만 있고 라벨이 없으면 이전 링크를 숨긴다(href·label 둘 다 있어야 노출)", () => {
    const { queryByText } = render(
      <NextStep
        prevHref="/dashboard"
        nextHref="/allocation"
        nextLabel="자산배분 보기"
      />,
    );
    // hasPrev = prevHref && prevLabel → label 누락이면 prev 미렌더
    expect(queryByText("자산배분 보기")).not.toBeNull(); // next 는 정상
    expect(queryByText("←")).toBeNull(); // prev 화살표 부재
  });
});
