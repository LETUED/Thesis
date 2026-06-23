"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { ApiError, getCompanyById, searchCompaniesApi } from "@/lib/api";
import { searchCompanies } from "@/lib/lab/data";
import type {
  CompanyDirectoryEntry,
  CompanyFundamentals,
  Tier,
} from "@/lib/types";
import { toCompanyRef } from "@/lib/personalization/companyId";
import { recordRecentlyViewed } from "@/lib/personalization/recentlyViewed";
import { CompanyVerdictCard } from "@/components/company/CompanyVerdictCard";

// 기업분석 검색·선택 island. CompanySearch.tsx(랩 캔버스 전용)는 건드리지 않고
// 동일 API(searchCompaniesApi·getCompanyById)만 재사용한다.
// 선택 시 재무를 온디맨드로 불러와 CompanyVerdictCard(평결) 를 렌더. zeroState 는
// 아무것도 선택하지 않은 초기 화면(서버에서 교육형 EmptyState 를 주입).

// 로컬 Company → 디렉토리 엔트리(서버 검색 실패 폴백용).
function toEntry(c: {
  id: string;
  name: string;
  ticker: string;
  exchange: string;
  country: string;
}): CompanyDirectoryEntry {
  return {
    id: c.id,
    name: c.name,
    ticker: c.ticker,
    exchange: c.exchange,
    country: c.country,
  };
}

export function CompanyLookup({
  tier,
  zeroState,
}: {
  tier: Tier;
  zeroState: ReactNode;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<CompanyDirectoryEntry[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<CompanyDirectoryEntry | null>(null);
  const [fundamentals, setFundamentals] = useState<CompanyFundamentals | null>(
    null,
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // 검색(디바운스 220ms) — CompanySearch.tsx 와 동일 패턴. 빈 검색어는 결과 비움.
  useEffect(() => {
    const query = q.trim();
    if (!query) {
      setResults([]);
      setSearching(false);
      return;
    }
    let active = true;
    setSearching(true);
    const t = setTimeout(() => {
      void searchCompaniesApi(query, 20)
        .then((rows) => {
          if (active) {
            setResults(rows);
            setSearching(false);
          }
        })
        .catch(() => {
          // 서버 미가동/실패 → 로컬(이미 로드된 종목)로 폴백.
          if (active) {
            setResults(searchCompanies(query).map(toEntry));
            setSearching(false);
          }
        });
    }, 220);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [q]);

  // 선택 → 재무 온디맨드 조회. 직전 요청은 ref 로 무효화(빠른 연속 선택 방어).
  const selectSeq = useRef(0);

  function handleSelect(entry: CompanyDirectoryEntry): void {
    const seq = ++selectSeq.current;
    setSelected(entry);
    setQ("");
    setResults([]);
    setFundamentals(null);
    setLoadError(null);
    setLoadingDetail(true);

    // 최근 본 기업 적재(Supabase, fail-open — 흐름 막지 않음).
    void recordRecentlyViewed(toCompanyRef(entry));

    void getCompanyById(entry.id)
      .then((data) => {
        if (seq !== selectSeq.current) return;
        setFundamentals(data);
        setLoadingDetail(false);
      })
      .catch((e: unknown) => {
        if (seq !== selectSeq.current) return;
        setLoadError(
          e instanceof ApiError
            ? e.message
            : "재무 데이터를 불러올 수 없습니다.",
        );
        setLoadingDetail(false);
      });
  }

  function clearSelection(): void {
    selectSeq.current++;
    setSelected(null);
    setFundamentals(null);
    setLoadError(null);
    setLoadingDetail(false);
  }

  const showResults = q.trim().length > 0;

  return (
    <div className="space-y-5">
      {/* 검색바 */}
      <div className="relative">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 focus-within:ring-2 focus-within:ring-foreground/20">
          <Search
            className="h-4 w-4 shrink-0 text-muted-foreground"
            aria-hidden
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setQ("");
              else if (e.key === "Enter" && results[0]) handleSelect(results[0]);
            }}
            placeholder="기업명 또는 종목코드 (예: 엔비디아, NVDA, 005930)"
            aria-label="기업 검색"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {searching ? (
            <span
              className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground"
              aria-label="검색 중"
            />
          ) : q ? (
            <button
              type="button"
              onClick={() => setQ("")}
              aria-label="검색어 지우기"
              className="shrink-0 rounded text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        {/* 검색 결과 드롭다운 */}
        {showResults ? (
          <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-border bg-card p-1.5 shadow-lg">
            {results.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                {searching ? "검색 중…" : `“${q}” 검색 결과가 없어요`}
              </li>
            ) : (
              results.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(c)}
                    className="flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
                  >
                    <span className="min-w-0 truncate font-medium">
                      {c.name}
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="tabular-nums">{c.ticker}</span>
                      <span className="rounded bg-muted px-1 py-0.5 text-[10px]">
                        {c.exchange}
                      </span>
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        ) : null}
      </div>

      {/* 선택 결과 영역 */}
      {!selected ? (
        zeroState
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">
                {selected.name}
              </span>{" "}
              의 재무 평결
            </p>
            <button
              type="button"
              onClick={clearSelection}
              className="inline-flex items-center gap-1 rounded text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
              다른 기업 보기
            </button>
          </div>

          {loadingDetail ? (
            <div
              role="status"
              aria-label="재무 데이터 불러오는 중"
              className="space-y-3 rounded-xl border border-border bg-card p-5"
            >
              <div className="h-5 w-40 animate-pulse rounded bg-muted" />
              <div className="h-4 w-64 animate-pulse rounded bg-muted" />
              <div className="h-24 w-full animate-pulse rounded bg-muted" />
            </div>
          ) : loadError ? (
            <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
              {loadError}
            </div>
          ) : fundamentals ? (
            <CompanyVerdictCard company={fundamentals} tier={tier} />
          ) : null}
        </div>
      )}
    </div>
  );
}
