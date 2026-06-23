// 저장한 자산배분 규칙 영속화 — Supabase 직접·fail-open.
// 미인증/에러 시 빈배열·false 로 흘러 UI 가 깨지지 않는다.

import { createClient } from "@/lib/supabase/client";
import type { SavedRule } from "./companyId";

const TABLE = "saved_rules";

// 저장 입력 — id/created_at 은 서버 생성.
export interface SaveRuleInput {
  name: string;
  risk_tolerance?: string | null;
  horizon?: string | null;
  reflect_current_regime?: boolean | null;
}

export async function listSavedRules(): Promise<SavedRule[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from(TABLE)
    .select(
      "id, name, risk_tolerance, horizon, reflect_current_regime, created_at",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data as SavedRule[];
}

export async function saveRule(input: SaveRuleInput): Promise<boolean> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase.from(TABLE).insert({
    user_id: user.id,
    name: input.name,
    risk_tolerance: input.risk_tolerance ?? null,
    horizon: input.horizon ?? null,
    reflect_current_regime: input.reflect_current_regime ?? null,
  });

  return !error;
}

export async function deleteRule(id: string): Promise<boolean> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq("user_id", user.id)
    .eq("id", id);

  return !error;
}
