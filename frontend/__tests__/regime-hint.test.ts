import { describe, it, expect } from "vitest";
import { REGIME_HINT } from "@/lib/regime";

// 입문자 용어 풀이(설계철학3: 입문자 보호). '리스크온' 같은 용어를 풀어 설명한다.

describe("REGIME_HINT — 국면 용어 입문자 풀이", () => {
  it("모든 국면 라벨에 비어있지 않은 풀이가 있다", () => {
    expect(REGIME_HINT["리스크온"]).toBeTruthy();
    expect(REGIME_HINT["중립"]).toBeTruthy();
    expect(REGIME_HINT["리스크오프"]).toBeTruthy();
  });

  it("풀이에 '매도'·'지금 사세요' 같은 행동 강요 톤이 없다", () => {
    for (const hint of Object.values(REGIME_HINT)) {
      expect(hint).not.toContain("매도");
      expect(hint).not.toContain("사세요");
      expect(hint).not.toContain("매수");
    }
  });
});
