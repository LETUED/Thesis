// 백엔드 데이터 출처 토큰 → 사용자 친화 라벨.
// 백엔드는 source 를 "+"로 조합한다(예: "dart+yfinance+mock", "yfinance+mock", "unavailable").
// 따라서 단일값 매핑이 아니라 토큰을 분해해 각각 매핑한다.
// 정직 표기(신뢰의 핵심): mock 이 섞이면 '예시 데이터'임을 반드시 알리고, 실데이터 출처가
// 하나도 없고 mock 도 아니면(unavailable/loading/미확정) 출처를 생략한다(raw 내부 토큰 노출 금지).

const SOURCE_TOKEN: Record<string, string> = {
  dart: "DART 공시",
  yfinance: "Yahoo Finance",
  pykrx: "KRX",
};

export function sourceLabel(source?: string | null): string | null {
  if (!source) return null;
  const tokens = source
    .split("+")
    .map((t) => t.trim())
    .filter(Boolean);

  const hasMock = tokens.includes("mock");
  const named = tokens
    .map((t) => SOURCE_TOKEN[t])
    .filter((v): v is string => Boolean(v));

  const parts = [...named];
  if (hasMock) parts.push(named.length > 0 ? "예시 데이터 포함" : "예시 데이터");

  // 실데이터 출처도 mock 도 없으면(unavailable/loading/미지 토큰) 출처 미표기 — 오인 방지.
  return parts.length > 0 ? parts.join(" · ") : null;
}
