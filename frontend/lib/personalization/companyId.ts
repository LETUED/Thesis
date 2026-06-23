// 개인화 공통 타입 + company_id 규약 헬퍼.
// 정식 company_id = lab Company.id(ISIN형 안정 id, 예 "KR7005930003"/"US67066G1040").
// 행에 ticker/name/exchange 를 비정규화 저장해 패치 조인 없이 즉시 렌더한다.

import type { Company } from "@/lib/lab/data";
import type { CompanyDirectoryEntry } from "@/lib/types";

// 비정규화 회사 식별 묶음 — 워치리스트/최근본기업 공통 입력.
export interface CompanyRef {
  company_id: string;
  ticker: string | null;
  name: string | null;
  exchange: string | null;
}

// 관심종목 1건(테이블 + UI 공통).
export interface WatchlistItem extends CompanyRef {
  id: string;
  created_at: string;
}

// 최근 본 기업 1건.
export interface RecentCompany extends CompanyRef {
  id: string;
  viewed_at: string;
}

// 저장한 자산배분 규칙 1건.
export interface SavedRule {
  id: string;
  name: string;
  risk_tolerance: string | null;
  horizon: string | null;
  reflect_current_regime: boolean | null;
  created_at: string;
}

// 정식 company_id 추출 — Company / CompanyDirectoryEntry 모두 id 가 ISIN형 식별자.
export function toCompanyId(c: Company | CompanyDirectoryEntry): string {
  return c.id;
}

// Company / CompanyDirectoryEntry → 비정규화 행(저장용). 패치 없이 렌더하도록 평탄화.
export function toCompanyRef(c: Company | CompanyDirectoryEntry): CompanyRef {
  return {
    company_id: c.id,
    ticker: c.ticker ?? null,
    name: c.name ?? null,
    exchange: c.exchange ?? null,
  };
}
