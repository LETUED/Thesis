import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { DisclaimerBanner } from "@/components/DisclaimerBanner";
import { OverconfidenceBanner } from "@/components/OverconfidenceBanner";
import { StaleNotice } from "@/components/StaleNotice";

// (b) 배너 wrapper 톤 매핑 — 각 wrapper 가 의도된 톤/역할/문구로 매핑되는지 검증.
// NoticeBanner 는 톤별로 색 단독 의존을 피하려 항상 아이콘을 동반한다(lucide-react).
// 아이콘은 `lucide` + `lucide-<kebab>` 두 클래스로 렌더되므로 이를 톤 매핑의 안정적 단언으로 쓴다.
//   info → lucide-info, warn → lucide-cloud-off, shield → lucide-shield-alert

describe("OverconfidenceBanner — 과신 방지(경고성) 톤", () => {
  it("note 역할의 배너로 렌더된다", () => {
    const { getByRole } = render(<OverconfidenceBanner />);
    expect(getByRole("note")).toBeInTheDocument();
  });

  it("shield 톤(경고성) 아이콘이 동반된다", () => {
    const { container } = render(<OverconfidenceBanner />);
    const icon = container.querySelector(".lucide-shield-alert");
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveAttribute("aria-hidden");
    // 색 단독 의존 금지: 다른 톤 아이콘으로 새지 않는다.
    expect(container.querySelector(".lucide-info")).toBeNull();
    expect(container.querySelector(".lucide-cloud-off")).toBeNull();
  });

  it("과신 방지 핵심 문구를 담는다 — '근거의 모음'·'권유가 아닙니다'·'과신'", () => {
    const { getByRole } = render(<OverconfidenceBanner />);
    const text = getByRole("note").textContent ?? "";
    expect(text).toContain("근거의 모음");
    expect(text).toContain("권유가 아닙니다");
    expect(text).toContain("과신");
  });

  it("'매도'·'지금 사세요' 같은 행동 강요 문구를 담지 않는다", () => {
    const { getByRole } = render(<OverconfidenceBanner />);
    const text = getByRole("note").textContent ?? "";
    expect(text).not.toContain("매도");
    expect(text).not.toContain("지금 사세요");
    expect(text).not.toContain("매수하세요");
  });
});

describe("StaleNotice — 신선도 지연(warn) 톤", () => {
  it("note 역할의 배너로 렌더된다", () => {
    const { getByRole } = render(<StaleNotice />);
    expect(getByRole("note")).toBeInTheDocument();
  });

  it("warn 톤(CloudOff) 아이콘이 동반된다", () => {
    const { container } = render(<StaleNotice />);
    const icon = container.querySelector(".lucide-cloud-off");
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveAttribute("aria-hidden");
    expect(container.querySelector(".lucide-shield-alert")).toBeNull();
  });

  it("데이터 지연을 정직하게 고지하는 문구를 담는다", () => {
    const { getByRole } = render(<StaleNotice />);
    const text = getByRole("note").textContent ?? "";
    expect(text).toContain("데이터 갱신이 지연");
    expect(text).toContain("최신이 아닐 수 있습니다");
  });
});

describe("DisclaimerBanner — 면책(disclaimer) 톤", () => {
  const SAMPLE =
    "본 정보는 투자 참고용이며, 투자 판단과 책임은 본인에게 있습니다.";

  it("기본 inline 변형은 note 역할의 단락으로 전달 문구를 그대로 노출한다", () => {
    const { getByRole } = render(<DisclaimerBanner text={SAMPLE} />);
    const note = getByRole("note");
    expect(note.tagName).toBe("P");
    expect(note).toHaveTextContent(SAMPLE);
  });

  it("emphasis 변형은 info 톤 배너(Info 아이콘)로 매핑된다", () => {
    const { container, getByRole } = render(
      <DisclaimerBanner text={SAMPLE} variant="emphasis" />,
    );
    expect(getByRole("note")).toHaveTextContent(SAMPLE);
    const icon = container.querySelector(".lucide-info");
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveAttribute("aria-hidden");
    // 면책은 경고성 톤이 아니다 — shield/warn 아이콘으로 새지 않는다.
    expect(container.querySelector(".lucide-shield-alert")).toBeNull();
    expect(container.querySelector(".lucide-cloud-off")).toBeNull();
  });

  it("빈 문구면 아무것도 렌더하지 않는다", () => {
    const { container } = render(<DisclaimerBanner text="" />);
    expect(container).toBeEmptyDOMElement();
  });
});
