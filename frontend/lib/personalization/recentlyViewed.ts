// 최근 본 기업 영속화 — Supabase 직접·fail-open. upsert 로 viewed_at 갱신,
// 상한 20개 초과분은 프론트에서 트림(오래된 행 삭제). 실패해도 흐름을 막지 않는다.

import { createClient } from "@/lib/supabase/client";
import type { CompanyRef, RecentCompany } from "./companyId";

const TABLE = "recently_viewed";
const MAX_RECENT = 20;

export async function recordRecentlyViewed(row: CompanyRef): Promise<boolean> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const now = new Date().toISOString();
  const { error } = await supabase.from(TABLE).upsert(
    {
      user_id: user.id,
      company_id: row.company_id,
      ticker: row.ticker,
      name: row.name,
      exchange: row.exchange,
      viewed_at: now,
    },
    { onConflict: "user_id,company_id" },
  );

  if (error) return false;

  // 상한 트림 — 21번째 이후 오래된 행 삭제(best-effort, 실패 무시).
  const { data } = await supabase
    .from(TABLE)
    .select("company_id")
    .eq("user_id", user.id)
    .order("viewed_at", { ascending: false });

  if (data && data.length > MAX_RECENT) {
    const overflow = data
      .slice(MAX_RECENT)
      .map((r) => (r as { company_id: string }).company_id);
    if (overflow.length > 0) {
      await supabase
        .from(TABLE)
        .delete()
        .eq("user_id", user.id)
        .in("company_id", overflow);
    }
  }

  return true;
}

export async function listRecentlyViewed(): Promise<RecentCompany[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from(TABLE)
    .select("id, company_id, ticker, name, exchange, viewed_at")
    .eq("user_id", user.id)
    .order("viewed_at", { ascending: false })
    .limit(MAX_RECENT);

  if (error || !data) return [];
  return data as RecentCompany[];
}
