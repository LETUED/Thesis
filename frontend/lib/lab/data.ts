// 조립 분석 실험실 기업 데이터. 기본은 MOCK(AI 반도체 4개사), 백엔드(/api/companies)
// 연결 시 실데이터(한국 DART + 미국·시세 yfinance)로 런타임 교체된다(hydrateCompaniesFromApi).

import type { CompanyDirectoryEntry, CompanyFundamentals } from "@/lib/types";

export interface Company {
  // 내부 PK = ISIN(ISO 6166, 전 세계 유일). 티커는 거래소간 충돌·변경되므로 PK로 쓰지 않음.
  id: string;
  name: string; // 표시명(한글)
  ticker: string; // 거래소 로컬 코드/티커 (NVDA, 005930)
  yahoo: string; // yfinance 심볼 (NVDA, 005930.KS) — 실데이터 수집용
  exchange: string; // 거래소 (NASDAQ, KRX …)
  country: string; // ISO 국가코드 (US, KR …)
  aliases?: string[]; // 검색 별칭(영문명·약칭)
  source?: string; // 데이터 출처(dart/yfinance/mock). 백엔드 연결 시 채워짐
  period?: string; // DART 재무 기준 분기(예: "2026 1분기")
  // ── 재무(기본 MOCK, 백엔드 연결 시 실데이터로 교체) ──
  forwardPer: number; // 배
  roe: number | null; // % (null = 데이터 미수집 → 정직 표기)
  opMargin: number; // %
  revenueGrowth: number; // % YoY
  netMargin: number; // % 순이익률
  pbr: number; // 배 주가순자산비율
  debtToEquity: number; // % 부채비율(부채/자본)
  dividendYield: number; // % 배당수익률
}

// let — 백엔드(/api/companies) 실데이터로 런타임 교체 가능(hydrateCompaniesFromApi).
// 미연결/실패 시 아래 mock 이 폴백으로 유지된다.
export let COMPANIES: Company[] = [
  { id: "KR7005930003", name: "삼성전자", ticker: "005930", yahoo: "005930.KS", exchange: "KRX", country: "KR", aliases: ["samsung", "삼성", "삼성전자", "ss"], forwardPer: 6.8, roe: 56.6, opMargin: 42.8, revenueGrowth: 69, netMargin: 14, pbr: 1.3, debtToEquity: 12, dividendYield: 2.6 },
  { id: "KR7000660001", name: "SK하이닉스", ticker: "000660", yahoo: "000660.KS", exchange: "KRX", country: "KR", aliases: ["sk hynix", "하이닉스", "sk", "hynix"], forwardPer: 6.8, roe: null, opMargin: 72, revenueGrowth: 198, netMargin: 30, pbr: 2.1, debtToEquity: 38, dividendYield: 1.0 },
  { id: "US67066G1040", name: "엔비디아", ticker: "NVDA", yahoo: "NVDA", exchange: "NASDAQ", country: "US", aliases: ["nvidia", "엔비디아", "엔비"], forwardPer: 22.0, roe: 114, opMargin: 60, revenueGrowth: 65, netMargin: 51, pbr: 28, debtToEquity: 13, dividendYield: 0.03 },
  { id: "US11135F1012", name: "브로드컴", ticker: "AVGO", yahoo: "AVGO", exchange: "NASDAQ", country: "US", aliases: ["broadcom", "브로드컴"], forwardPer: 24.6, roe: 37.3, opMargin: 44.2, revenueGrowth: 48, netMargin: 24, pbr: 13, debtToEquity: 98, dividendYield: 1.2 },
];

// 구 저장본 호환 — 옛 슬러그 id(samsung 등) → 현 ISIN id 매핑.
const LEGACY_COMPANY_IDS: Record<string, string> = {
  samsung: "KR7005930003",
  skhynix: "KR7000660001",
  nvda: "US67066G1040",
  avgo: "US11135F1012",
};

// companyId(ISIN 또는 구 슬러그) → Company. 저장된 옛 id도 안전하게 해석.
export function getCompany(idOrLegacy: string): Company | undefined {
  const direct = COMPANIES.find((c) => c.id === idOrLegacy);
  if (direct) return direct;
  const mapped = LEGACY_COMPANY_IDS[idOrLegacy];
  return mapped ? COMPANIES.find((c) => c.id === mapped) : undefined;
}

// 백엔드 CompanyFundamentals(snake_case) → Company(camelCase). 누락 필드는 base(mock/stub)로 보강.
function mapApiCompany(r: CompanyFundamentals, base?: Company): Company {
  return {
    id: r.id,
    name: r.name || base?.name || r.ticker,
    ticker: r.ticker,
    yahoo: r.yahoo,
    exchange: r.exchange,
    country: r.country,
    aliases: r.aliases?.length ? r.aliases : base?.aliases,
    source: r.source,
    period: r.period || undefined,
    forwardPer: r.forward_per ?? base?.forwardPer ?? 0,
    roe: r.roe ?? base?.roe ?? null,
    opMargin: r.op_margin ?? base?.opMargin ?? 0,
    revenueGrowth: r.revenue_growth ?? base?.revenueGrowth ?? 0,
    netMargin: r.net_margin ?? base?.netMargin ?? 0,
    pbr: r.pbr ?? base?.pbr ?? 0,
    debtToEquity: r.debt_to_equity ?? base?.debtToEquity ?? 0,
    dividendYield: r.dividend_yield ?? base?.dividendYield ?? 0,
  };
}

// 백엔드 행 → Company[] 순수 변환(전역 COMPANIES 변이 없음 — 서버 컴포넌트 안전).
// 누락 필드는 동일 id 의 mock(base)로 보강하되, base 조회는 읽기 전용이라 요청 간 공유 안전.
export function companiesFromApi(rows: CompanyFundamentals[]): Company[] {
  return rows.map((r) => mapApiCompany(r, COMPANIES.find((c) => c.id === r.id)));
}

// 기본 종목 묶음을 COMPANIES 에 반영. upsert 라 사용자가 검색으로 추가한 종목은 보존된다.
export function hydrateCompaniesFromApi(rows: CompanyFundamentals[]): void {
  if (!rows.length) return;
  for (const r of rows) upsertCompanyFromApi(r);
}

// 단일 종목 upsert(있으면 갱신, 없으면 추가) — 검색 선택/저장 복원 시 다른 종목을 건드리지 않음.
export function upsertCompanyFromApi(row: CompanyFundamentals): void {
  const base = COMPANIES.find((c) => c.id === row.id);
  const mapped = mapApiCompany(row, base);
  COMPANIES = base
    ? COMPANIES.map((c) => (c.id === row.id ? mapped : c))
    : [...COMPANIES, mapped];
}

// 검색 결과(식별자만) → 재무 도착 전 임시 표시용 stub 추가(이름은 즉시 노출). 이미 있으면 보존.
export function ensureCompanyStub(e: CompanyDirectoryEntry): void {
  if (COMPANIES.some((c) => c.id === e.id)) return;
  COMPANIES = [
    ...COMPANIES,
    {
      id: e.id,
      name: e.name,
      ticker: e.ticker,
      yahoo: e.ticker,
      exchange: e.exchange,
      country: e.country,
      source: "loading", // 재무 로딩 중 — 노드가 '불러오는 중'으로 표기
      forwardPer: 0,
      roe: null,
      opMargin: 0,
      revenueGrowth: 0,
      netMargin: 0,
      pbr: 0,
      debtToEquity: 0,
      dividendYield: 0,
    },
  ];
}

// 부분 문자열이 순서대로 등장하면 매치(가벼운 오타·부분 입력 허용).
function subsequence(q: string, s: string): boolean {
  let i = 0;
  for (let j = 0; j < s.length && i < q.length; j++) {
    if (s[j] === q[i]) i++;
  }
  return i === q.length;
}

// 관대한 기업 검색 — 이름/티커/ISIN/거래소/국가/별칭을 매칭하고 관련도순 정렬.
// 정확히 입력하지 않아도 유사 결과를 보여준다(편의 우선).
export function searchCompanies(query: string): Company[] {
  const q = query.trim().toLowerCase();
  if (!q) return COMPANIES;
  const scored = COMPANIES.map((c) => {
    const fields = [
      c.name,
      c.ticker,
      c.id,
      c.exchange,
      c.country,
      ...(c.aliases ?? []),
    ].map((f) => f.toLowerCase());
    let best = 0;
    for (const f of fields) {
      if (f === q) best = Math.max(best, 100);
      else if (f.startsWith(q)) best = Math.max(best, 80);
      else if (f.includes(q)) best = Math.max(best, 60);
      else if (subsequence(q, f)) best = Math.max(best, 30);
    }
    return { c, best };
  })
    .filter((x) => x.best > 0)
    .sort((a, b) => b.best - a.best || a.c.name.localeCompare(b.c.name));
  return scored.map((x) => x.c);
}

export type Tone = "good" | "neutral" | "watch";

export interface MetricResult {
  value: number | null;
  display: string; // 단위 포함 표시
  tone: Tone;
  note: string; // 한 줄 해석(점검 톤, '사세요' 금지)
}

export interface MetricBlock {
  id: string;
  name: string;
  explanation: string; // 입문자용 한 줄 설명
  pro?: boolean; // 점진 언락 BM(docs/07 등급) — 현재 free/pro 2단(quant는 step4)
  higherIsBetter?: boolean; // 순위 정렬 방향(기본 true). PER/PBR/PEG/부채비율은 false.
  compute: (c: Company) => MetricResult;
}

const pct = (v: number) => `${v.toFixed(1)}%`;
const clamp100 = (v: number) => Math.max(0, Math.min(100, v));

// 임계값은 CLAUDE.md 기준(ROE>15%, 영업이익률>20%, PEG<1). 색만으로 의미전달 금지 → note 병기.
export const BLOCKS: MetricBlock[] = [
  {
    id: "roe",
    name: "ROE · 자기자본이익률",
    explanation: "자본 대비 얼마를 버는지. 높을수록 효율적이에요.",
    compute: (c) =>
      c.roe === null
        ? { value: null, display: "데이터 없음", tone: "neutral", note: "이 기업은 ROE를 아직 수집하지 못했어요(정직 표기)." }
        : { value: c.roe, display: pct(c.roe), tone: c.roe >= 15 ? "good" : "watch", note: c.roe >= 15 ? "기준치(15%)를 넘는 자본 효율입니다." : "자본 효율이 기준치 아래예요." },
  },
  {
    id: "opMargin",
    name: "영업이익률",
    explanation: "매출 중 영업이익 비율. 수익성의 핵심이에요.",
    compute: (c) => ({ value: c.opMargin, display: pct(c.opMargin), tone: c.opMargin >= 20 ? "good" : "watch", note: c.opMargin >= 20 ? "기준치(20%)를 넘는 수익성입니다." : "수익성이 기준치 아래예요." }),
  },
  {
    id: "netMargin",
    name: "순이익률",
    explanation: "매출에서 세금·비용 다 빼고 남는 비율이에요.",
    compute: (c) => ({ value: c.netMargin, display: pct(c.netMargin), tone: c.netMargin >= 10 ? "good" : "watch", note: c.netMargin >= 10 ? "최종적으로 남기는 이익이 양호해요." : "최종 이익률이 얇은 편이에요." }),
  },
  {
    id: "growth",
    name: "매출성장률 (YoY)",
    explanation: "전년 대비 매출이 얼마나 늘었는지예요.",
    compute: (c) => ({ value: c.revenueGrowth, display: `+${c.revenueGrowth.toFixed(0)}%`, tone: c.revenueGrowth >= 20 ? "good" : "neutral", note: c.revenueGrowth >= 20 ? "성장세가 가파른 편입니다." : "성장세는 완만한 편이에요." }),
  },
  {
    id: "per",
    name: "PER · 주가수익비율",
    explanation: "주가가 이익의 몇 배인지. 낮을수록 저평가 가능성.",
    higherIsBetter: false,
    compute: (c) => ({ value: c.forwardPer, display: `${c.forwardPer.toFixed(1)}배`, tone: c.forwardPer <= 15 ? "good" : "neutral", note: c.forwardPer <= 15 ? "이익 대비 가격 부담이 낮은 편이에요." : "이익 대비 가격이 높은 편이에요." }),
  },
  {
    id: "pbr",
    name: "PBR · 주가순자산비율",
    explanation: "주가가 순자산의 몇 배인지. 1배 미만이면 자산 대비 저평가.",
    higherIsBetter: false,
    compute: (c) => ({ value: c.pbr, display: `${c.pbr.toFixed(1)}배`, tone: c.pbr <= 1 ? "good" : c.pbr <= 3 ? "neutral" : "watch", note: c.pbr <= 1 ? "순자산보다 싸게 거래되고 있어요." : c.pbr <= 3 ? "자산 대비 가격은 보통 범위예요." : "자산 대비 가격 기대가 높게 실려 있어요." }),
  },
  {
    id: "debtToEquity",
    name: "부채비율",
    explanation: "자본 대비 빚의 크기. 낮을수록 재무가 튼튼해요.",
    higherIsBetter: false,
    compute: (c) => ({ value: c.debtToEquity, display: pct(c.debtToEquity), tone: c.debtToEquity <= 100 ? "good" : c.debtToEquity <= 200 ? "neutral" : "watch", note: c.debtToEquity <= 100 ? "빚 부담이 안정적인 편이에요." : c.debtToEquity <= 200 ? "빚이 자본 수준을 넘어서고 있어요." : "빚 부담이 큰 편이라 살펴볼 필요가 있어요." }),
  },
  {
    id: "dividendYield",
    name: "배당수익률",
    explanation: "주가 대비 한 해 배당이 얼마인지예요.",
    compute: (c) => ({ value: c.dividendYield, display: pct(c.dividendYield), tone: c.dividendYield >= 2 ? "good" : c.dividendYield >= 0.5 ? "neutral" : "watch", note: c.dividendYield >= 2 ? "배당을 꾸준히 챙겨주는 편이에요." : c.dividendYield >= 0.5 ? "배당은 소폭 있는 편이에요." : "성장에 재투자하느라 배당은 적어요." }),
  },
  {
    id: "peg",
    name: "PEG · 성장 대비 가치",
    explanation: "PER을 성장률로 나눈 값. 1 미만이면 성장 대비 저평가.",
    pro: true,
    higherIsBetter: false,
    compute: (c) => {
      const peg = c.forwardPer / c.revenueGrowth;
      return { value: peg, display: peg.toFixed(2), tone: peg < 1 ? "good" : "watch", note: peg < 1 ? "성장 대비 가격이 매력적인 구간이에요." : "성장 대비 가격 부담이 있어요." };
    },
  },
  {
    id: "score",
    name: "종합 점수",
    explanation: "수익성·성장·가치를 한 점수(0~100)로 묶어 본 참고치예요.",
    pro: true,
    compute: (c) => {
      const roeScore = c.roe === null ? 50 : clamp100((c.roe / 30) * 100);
      const opScore = clamp100((c.opMargin / 40) * 100);
      const growthScore = clamp100((c.revenueGrowth / 50) * 100);
      const valScore = clamp100(((30 - c.forwardPer) / 15) * 100);
      const score = Math.round((roeScore + opScore + growthScore + valScore) / 4);
      return {
        value: score,
        display: `${score}점`,
        tone: score >= 70 ? "good" : score >= 45 ? "neutral" : "watch",
        note: "여러 지표를 단순 가중한 참고용 점수예요. 백테스트·예측이 아니며 매수 신호가 아닙니다.",
      };
    },
  },
];

export interface Template {
  id: string;
  name: string;
  desc: string;
  blockIds: string[];
}

export const TEMPLATES: Template[] = [
  { id: "profit", name: "수익성 한눈에", desc: "이 기업이 효율적으로 돈을 버는지", blockIds: ["roe", "opMargin", "netMargin"] },
  { id: "valuation", name: "밸류에이션 체크", desc: "지금 가격이 비싼지 싼지", blockIds: ["per", "pbr", "peg"] },
  { id: "growth", name: "성장성 보기", desc: "얼마나 빠르게 크고 있는지", blockIds: ["growth", "peg"] },
  { id: "health", name: "재무 안정성", desc: "빚은 적당한지, 배당은 주는지", blockIds: ["debtToEquity", "dividendYield"] },
  { id: "all", name: "종합", desc: "주요 지표 + 종합 점수까지", blockIds: ["roe", "opMargin", "growth", "per", "score"] },
];

export function getBlock(id: string): MetricBlock | undefined {
  return BLOCKS.find((b) => b.id === id);
}

// 팔레트 카테고리(접근성). 순서대로 그룹 헤딩으로 표시.
export const CATEGORIES = [
  "수익성",
  "성장성",
  "밸류에이션",
  "재무건전성",
  "배당",
  "종합",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const BLOCK_CATEGORY: Record<string, Category> = {
  roe: "수익성",
  opMargin: "수익성",
  netMargin: "수익성",
  growth: "성장성",
  per: "밸류에이션",
  pbr: "밸류에이션",
  peg: "밸류에이션",
  debtToEquity: "재무건전성",
  dividendYield: "배당",
  score: "종합",
};

export function blocksByCategory(cat: Category): MetricBlock[] {
  return BLOCKS.filter((b) => BLOCK_CATEGORY[b.id] === cat);
}

// ── 커스텀 수식(Quant 블록) ──────────────────────────────────────────────────
// 사용자가 두 재무 필드를 사칙연산으로 조합해 자기만의 지표를 만든다(docs/06 경계:
// 연산은 산술 4종으로 제한). 과신 방지: 자작 지표라 정답이 아님(disclaimer).
export type FormulaOp = "+" | "-" | "*" | "/";
export const FORMULA_OPS: FormulaOp[] = ["+", "-", "*", "/"];
export const FORMULA_OP_LABEL: Record<FormulaOp, string> = {
  "+": "+",
  "-": "−",
  "*": "×",
  "/": "÷",
};

// 수식에 쓸 수 있는 재무 필드(라벨 표시용).
export const FORMULA_FIELDS: { key: string; label: string }[] = [
  { key: "roe", label: "ROE" },
  { key: "opMargin", label: "영업이익률" },
  { key: "netMargin", label: "순이익률" },
  { key: "revenueGrowth", label: "매출성장" },
  { key: "forwardPer", label: "PER" },
  { key: "pbr", label: "PBR" },
  { key: "debtToEquity", label: "부채비율" },
  { key: "dividendYield", label: "배당수익률" },
];

const FIELD_GETTERS: Record<string, (c: Company) => number | null> = {
  roe: (c) => c.roe,
  opMargin: (c) => c.opMargin,
  netMargin: (c) => c.netMargin,
  revenueGrowth: (c) => c.revenueGrowth,
  forwardPer: (c) => c.forwardPer,
  pbr: (c) => c.pbr,
  debtToEquity: (c) => c.debtToEquity,
  dividendYield: (c) => c.dividendYield,
};

export function fieldLabel(key: string): string {
  return FORMULA_FIELDS.find((f) => f.key === key)?.label ?? key;
}

// 기업 1개에 대해 (a op b) 계산. 결측/0 나눗셈은 null(가짜 숫자 금지).
export function computeFormula(
  c: Company,
  a: string,
  op: FormulaOp,
  b: string,
): number | null {
  const av = FIELD_GETTERS[a]?.(c) ?? null;
  const bv = FIELD_GETTERS[b]?.(c) ?? null;
  if (av === null || bv === null) return null;
  switch (op) {
    case "+":
      return av + bv;
    case "-":
      return av - bv;
    case "*":
      return av * bv;
    case "/":
      return bv === 0 ? null : av / bv;
  }
}
