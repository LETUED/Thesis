import { describe, it, expect } from "vitest";
import { formatAsOf } from "@/lib/utils/datetime";

describe("formatAsOf — 결정적 KST 절대시각", () => {
  it("UTC를 Asia/Seoul(+9)로 변환해 24시간 형식으로 표기", () => {
    const out = formatAsOf("2026-06-24T05:30:00Z"); // KST 14:30
    expect(out).toContain("14:30");
    expect(out).toContain("6월");
    expect(out).toContain("24일");
  });

  it("자정 경계도 날짜가 KST 기준으로 넘어간다", () => {
    const out = formatAsOf("2026-06-23T16:00:00Z"); // KST 2026-06-24 01:00
    expect(out).toContain("24일");
    expect(out).toContain("01:00");
  });

  it("자정은 00:00으로(일부 ICU의 24:00 회귀 방지)", () => {
    const out = formatAsOf("2026-06-23T15:00:00Z"); // KST 2026-06-24 00:00
    expect(out).toContain("00:00");
    expect(out).not.toContain("24:00");
  });

  it("빈/잘못된 입력은 빈 문자열", () => {
    expect(formatAsOf(null)).toBe("");
    expect(formatAsOf(undefined)).toBe("");
    expect(formatAsOf("")).toBe("");
    expect(formatAsOf("not-a-date")).toBe("");
  });
});
