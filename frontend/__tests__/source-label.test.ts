import { describe, it, expect } from "vitest";
import { sourceLabel } from "@/lib/utils/sourceLabel";

describe("sourceLabel — 조합 source 토큰 분해 + 정직 표기", () => {
  it("단일 실데이터 출처를 친화 라벨로", () => {
    expect(sourceLabel("dart")).toBe("DART 공시");
    expect(sourceLabel("yfinance")).toBe("Yahoo Finance");
  });

  it("조합 출처를 각각 매핑해 · 로 연결", () => {
    expect(sourceLabel("dart+yfinance")).toBe("DART 공시 · Yahoo Finance");
  });

  it("mock 단독은 '예시 데이터'로 정직 표기", () => {
    expect(sourceLabel("mock")).toBe("예시 데이터");
  });

  it("mock 이 실데이터와 섞이면 '예시 데이터 포함'을 덧붙인다(실데이터 오인 방지)", () => {
    expect(sourceLabel("dart+yfinance+mock")).toBe(
      "DART 공시 · Yahoo Finance · 예시 데이터 포함",
    );
    expect(sourceLabel("yfinance+mock")).toBe("Yahoo Finance · 예시 데이터 포함");
  });

  it("내부/미지 토큰(unavailable·loading)·빈값은 출처 생략(raw 노출 금지)", () => {
    expect(sourceLabel("unavailable")).toBeNull();
    expect(sourceLabel("loading")).toBeNull();
    expect(sourceLabel("")).toBeNull();
    expect(sourceLabel(null)).toBeNull();
    expect(sourceLabel(undefined)).toBeNull();
  });

  it("미지 토큰이 섞여도 알려진 출처만 노출", () => {
    expect(sourceLabel("dart+unknownsrc")).toBe("DART 공시");
  });
});
