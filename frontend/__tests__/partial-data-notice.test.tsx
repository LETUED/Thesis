import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { PartialDataNotice } from "@/components/PartialDataNotice";

// 부분실패 고지(설계철학5): 일부 지표 누락을 정직히 알려 과신을 막는다.

describe("PartialDataNotice — 부분실패 고지", () => {
  it("실패 지표가 있으면 개수와 근거 제한을 고지한다", () => {
    const { getByText } = render(<PartialDataNotice failedCount={3} />);
    expect(getByText(/3개/)).toBeInTheDocument();
    expect(getByText(/근거가 제한된 결론/)).toBeInTheDocument();
  });

  it("실패가 없으면(0) 아무것도 렌더하지 않는다", () => {
    const { container } = render(<PartialDataNotice failedCount={0} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("'매수'·'지금 사세요' 같은 행동 강요나 공포 톤을 담지 않는다", () => {
    const { container } = render(<PartialDataNotice failedCount={2} />);
    const text = container.textContent ?? "";
    expect(text).not.toContain("매수");
    expect(text).not.toContain("지금 사세요");
    expect(text).not.toContain("위험");
  });
});
