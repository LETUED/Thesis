// 알림 영속화 — Supabase 직접·fail-open(watchlist.ts 패턴 모방).
// 테이블 미적용/미인증/에러 시 빈배열·{ok:false} 로 흘러 UI 가 깨지지 않는다.
//
// 철학: 알림은 "임계값 돌파 통지"에만 한정한다(저빈도). 게임화(점수·스트릭·푸시몰이) 금지.
// 매수·매도 권유 아님 — "이런 근거가 경계 구간에 들어섰다"는 정보 통지일 뿐.
//
// 조회 시점 평가(MVP): 스케줄러 없음. evaluateAlerts(metrics) 가 활성 rule 별 현재 status 를
// 확인해 직전 alert_event status 와 다른 신규 돌파만 insert(중복 방지). 실푸시는 후속
// APScheduler 가 동일 판정 로직으로 주기 평가·발송한다(여기서는 조회 시 적재만).

import { createClient } from "@/lib/supabase/client";
import { track } from "@/lib/analytics";
import type { Tier, TickerMetric, ThresholdHit } from "@/lib/types";

const RULES_TABLE = "alert_rules";
const EVENTS_TABLE = "alert_events";

// Free 소프트캡 — 1개까지 teaser, 이후 Pro. 서버 강제(RLS/트리거) 없이 클라이언트 판정.
const FREE_RULE_LIMIT = 1;

// 돌파로 간주하는 임계값 상태(경계/위험). calm·neutral 은 통지하지 않는다(저빈도 보장).
const BREACH_STATUSES: ReadonlySet<ThresholdHit> = new Set<ThresholdHit>([
  "warn",
  "danger",
]);

export interface AlertRule {
  id: string;
  symbol: string;
  threshold_kind: string;
  enabled: boolean;
}

export interface AlertEvent {
  id: string;
  rule_id: string;
  symbol: string;
  status: string;
  created_at: string;
}

// 추가 결과 — Free 소프트캡 초과는 reason:'limit', 그 외 실패는 reason:'error'.
export interface AddRuleResult {
  ok: boolean;
  reason?: "limit" | "error";
}

export async function listAlertRules(): Promise<AlertRule[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from(RULES_TABLE)
    .select("id, symbol, threshold_kind, enabled")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data as AlertRule[];
}

export async function addAlertRule(
  input: { symbol: string; threshold_kind: string },
  tier: Tier,
): Promise<AddRuleResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "error" };

  // Free 소프트캡 — 현재 rule 개수로 판정(서버 강제 아닌 best-effort UX).
  if (tier === "free") {
    const existing = await listAlertRules();
    if (existing.length >= FREE_RULE_LIMIT) {
      return { ok: false, reason: "limit" };
    }
  }

  const { error } = await supabase.from(RULES_TABLE).insert({
    user_id: user.id,
    symbol: input.symbol,
    threshold_kind: input.threshold_kind,
    enabled: true,
  });

  if (error) return { ok: false, reason: "error" };

  track("alert_rule_add", {
    symbol: input.symbol,
    threshold_kind: input.threshold_kind,
  });
  return { ok: true };
}

export async function removeAlertRule(id: string): Promise<boolean> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from(RULES_TABLE)
    .delete()
    .eq("user_id", user.id)
    .eq("id", id);

  return !error;
}

export async function setAlertEnabled(
  id: string,
  enabled: boolean,
): Promise<boolean> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from(RULES_TABLE)
    .update({ enabled })
    .eq("user_id", user.id)
    .eq("id", id);

  return !error;
}

export async function listAlertEvents(limit = 20): Promise<AlertEvent[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from(EVENTS_TABLE)
    .select("id, rule_id, symbol, status, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data as AlertEvent[];
}

// 조회 시점 평가 — 활성 rule 별 metric.symbol 매칭 → 현재 threshold_status 가 돌파(warn|danger)이고
// 직전 event status 와 다르면(=신규 돌파) alert_events 에 insert. 중복 돌파는 적재하지 않는다.
// 신규로 적재된 이벤트만 반환. 전 과정 fail-open(실패 시 빈배열).
export async function evaluateAlerts(
  metrics: TickerMetric[],
): Promise<AlertEvent[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const rules = await listAlertRules();
  const activeRules = rules.filter((r) => r.enabled);
  if (activeRules.length === 0) return [];

  const metricBySymbol = new Map<string, TickerMetric>();
  for (const m of metrics) metricBySymbol.set(m.symbol, m);

  // 직전 status 비교용 — 최근 이벤트를 rule_id 기준으로 1건씩만 캐싱.
  const recentEvents = await listAlertEvents(50);
  const lastStatusByRule = new Map<string, string>();
  for (const e of recentEvents) {
    if (!lastStatusByRule.has(e.rule_id)) {
      lastStatusByRule.set(e.rule_id, e.status);
    }
  }

  const toInsert: { user_id: string; rule_id: string; symbol: string; status: string }[] =
    [];

  for (const rule of activeRules) {
    const metric = metricBySymbol.get(rule.symbol);
    const status = metric?.threshold_status;
    if (!status || !BREACH_STATUSES.has(status)) continue;

    // 신규 돌파만 — 직전 적재 status 와 동일하면 통지하지 않는다(저빈도·중복 방지).
    if (lastStatusByRule.get(rule.id) === status) continue;

    toInsert.push({
      user_id: user.id,
      rule_id: rule.id,
      symbol: rule.symbol,
      status,
    });
  }

  if (toInsert.length === 0) return [];

  const { data, error } = await supabase
    .from(EVENTS_TABLE)
    .insert(toInsert)
    .select("id, rule_id, symbol, status, created_at");

  if (error || !data) return [];

  track("alert_event_breach", { count: data.length });
  return data as AlertEvent[];
}
