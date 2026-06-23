// 관심종목 영속화 — Supabase 직접·fail-open(persistence.ts 패턴 모방).
// 테이블 미적용/미인증/에러 시 빈배열·{ok:false} 로 흘러 UI 가 깨지지 않는다.

import { createClient } from "@/lib/supabase/client";
import { track } from "@/lib/analytics";
import type { CompanyRef, WatchlistItem } from "./companyId";

const TABLE = "watchlists";

export async function listWatchlist(): Promise<WatchlistItem[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from(TABLE)
    .select("id, company_id, ticker, name, exchange, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data as WatchlistItem[];
}

// 추가 결과 — 트리거 거부(Free 상한)는 reason:'limit', 그 외 실패는 reason:'error'.
export interface AddResult {
  ok: boolean;
  reason?: "limit" | "error";
}

export async function addToWatchlist(row: CompanyRef): Promise<AddResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "error" };

  const { error } = await supabase.from(TABLE).insert({
    user_id: user.id,
    company_id: row.company_id,
    ticker: row.ticker,
    name: row.name,
    exchange: row.exchange,
  });

  if (error) {
    // Free 상한 트리거 거부 메시지 식별 → limit, 그 외 → error.
    const reason = error.message?.includes("watchlist_free_limit")
      ? "limit"
      : "error";
    return { ok: false, reason };
  }

  track("watchlist_add", { company_id: row.company_id });
  return { ok: true };
}

export async function removeFromWatchlist(
  companyId: string,
): Promise<boolean> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq("user_id", user.id)
    .eq("company_id", companyId);

  return !error;
}

export function isWatched(
  items: WatchlistItem[],
  companyId: string,
): boolean {
  return items.some((w) => w.company_id === companyId);
}
