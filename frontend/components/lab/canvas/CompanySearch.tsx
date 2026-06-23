"use client";

import { useEffect, useId, useState } from "react";
import { Search, X } from "lucide-react";
import { ModalShell } from "@/components/ui/modal-shell";
import { searchCompanies } from "@/lib/lab/data";
import { searchCompaniesApi } from "@/lib/api";
import type { CompanyDirectoryEntry, Tier } from "@/lib/types";
import { toCompanyRef } from "@/lib/personalization/companyId";
import { recordRecentlyViewed } from "@/lib/personalization/recentlyViewed";
import { WatchlistButton } from "@/components/personalization/WatchlistButton";

const RECENT_KEY = "thesis:lab:recentCompanies";
const RECENT_MAX = 8;

// 로컬 Company → 디렉토리 엔트리(서버 실패 폴백용).
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

function loadRecent(): CompanyDirectoryEntry[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is CompanyDirectoryEntry =>
        !!e &&
        typeof (e as CompanyDirectoryEntry).id === "string" &&
        typeof (e as CompanyDirectoryEntry).name === "string",
    );
  } catch {
    return [];
  }
}

function saveRecent(list: CompanyDirectoryEntry[]): void {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {
    // 저장 실패(시크릿 모드 등) — 무시.
  }
}

// 기업 검색 모달 — '도로명 주소 검색' 식 UX. 입력하면 서버(/api/companies/search)에서
// 불러올 수 있는 모든 기업(한국 전 상장사 DART + 미국 전 상장사 SEC)을 찾는다.
// 빈 검색어일 땐 '최근 검색한 기업'(localStorage)을 보여주고, X 로 개별 삭제 가능.
export function CompanySearch({
  open,
  onClose,
  onSelect,
  tier = "free",
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (entry: CompanyDirectoryEntry) => void;
  tier?: Tier;
}) {
  const headingId = useId();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<CompanyDirectoryEntry[]>([]);
  const [recent, setRecent] = useState<CompanyDirectoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setQ("");
      setRecent(loadRecent());
    }
  }, [open]);

  // 입력 시에만 서버 검색(디바운스 220ms). 빈 검색어는 최근목록을 직접 렌더.
  useEffect(() => {
    if (!open) return;
    const query = q.trim();
    if (!query) {
      setResults([]);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    const t = setTimeout(() => {
      void searchCompaniesApi(query, 30)
        .then((rows) => {
          if (active) {
            setResults(rows);
            setLoading(false);
          }
        })
        .catch(() => {
          // 서버 미가동/실패 → 로컬(이미 로드된 종목)로 폴백.
          if (active) {
            setResults(searchCompanies(query).map(toEntry));
            setLoading(false);
          }
        });
    }, 220);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [q, open]);

  function handleSelect(entry: CompanyDirectoryEntry): void {
    const next = [entry, ...recent.filter((r) => r.id !== entry.id)].slice(
      0,
      RECENT_MAX,
    );
    setRecent(next);
    saveRecent(next);
    // 선택한 기업을 '최근 본 기업'으로 적재(Supabase, fail-open — 흐름 막지 않음).
    void recordRecentlyViewed(toCompanyRef(entry));
    onSelect(entry);
  }

  function removeRecent(id: string): void {
    const next = recent.filter((r) => r.id !== id);
    setRecent(next);
    saveRecent(next);
  }

  const showRecent = !q.trim();
  const list = showRecent ? recent : results;

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      labelledBy={headingId}
      className="rounded-xl"
    >
      <h2 id={headingId} className="sr-only">
        기업 검색
      </h2>
      <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              else if (e.key === "Enter" && list[0]) handleSelect(list[0]);
            }}
            placeholder="기업명 또는 종목코드 (예: 엔비디아, NVDA, 005930)"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {loading ? (
            <span
              className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground"
              aria-label="검색 중"
            />
          ) : null}
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="shrink-0 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {showRecent && recent.length > 0 ? (
          <p className="px-3 pt-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            최근 검색한 기업
          </p>
        ) : null}

        <ul className="max-h-72 overflow-y-auto p-1.5">
          {list.length === 0 ? (
            <li className="px-3 py-8 text-center text-sm text-muted-foreground">
              {showRecent
                ? "최근 검색한 기업이 없어요 — 기업명이나 종목코드로 검색해 보세요"
                : loading
                  ? "검색 중…"
                  : `“${q}” 검색 결과가 없어요`}
            </li>
          ) : (
            list.map((c) => (
              <li key={c.id} className="group/item flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleSelect(c)}
                  className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-surface-2"
                >
                  <span className="min-w-0 truncate font-medium">{c.name}</span>
                  <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="tabular-nums">{c.ticker}</span>
                    <span className="rounded bg-muted px-1 py-0.5 text-[10px]">
                      {c.exchange}
                    </span>
                  </span>
                </button>
                <WatchlistButton
                  company={toCompanyRef(c)}
                  tier={tier}
                  size="sm"
                  className="mr-0.5 shrink-0 border-0"
                />
                {showRecent ? (
                  <button
                    type="button"
                    onClick={() => removeRecent(c.id)}
                    aria-label={`${c.name} 최근 목록에서 삭제`}
                    className="mr-1 shrink-0 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-surface-2 hover:text-foreground group-hover/item:opacity-100"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </li>
            ))
          )}
        </ul>

        <p className="border-t border-border px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
          한국 전 상장사(DART) · 미국 전 상장사(SEC) — 선택하면 실데이터를 불러옵니다.
        </p>
    </ModalShell>
  );
}
