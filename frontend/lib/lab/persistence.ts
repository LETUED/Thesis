import { createClient } from "@/lib/supabase/client";

// 신호색(regime-on/off)과 겹치지 않는 중립 팔레트만 — '초록=매수' 오독 방지.
export type PageColor =
  | "slate"
  | "sky"
  | "violet"
  | "fuchsia"
  | "teal"
  | "indigo";

// 기업 블록 인스턴스(한 페이지에 여러 개 가능). companyId = data.ts의 기업 id.
export interface CompanyInstance {
  id: string; // 노드 id (예: "c_3")
  companyId: string;
  x: number;
  y: number;
}

// 디스플레이 노드 인스턴스 — 비교/순위/필터(출력은 평가로 산출). op/value 는 필터 전용.
export type DisplayKind = "compare" | "rank" | "filter";
export interface DisplayInstance {
  id: string; // 노드 id (예: "cmp_4", "rnk_5", "flt_6")
  kind: DisplayKind;
  x: number;
  y: number;
  op?: "gte" | "lte"; // filter 전용
  value?: number; // filter 전용
}

// 커스텀 수식(Quant) 노드 — a op b. 회사에서 받아 값을 산출하는 value-source.
export interface FormulaInstance {
  id: string; // 노드 id (예: "fml_7")
  x: number;
  y: number;
  a: string; // 필드 키
  op: "+" | "-" | "*" | "/";
  b: string;
  name?: string; // 사용자 지정 이름
}

// 한 페이지(캔버스) 직렬화. 함수는 저장하지 않고 복원 시 재구성.
export interface PageGraph {
  id: string;
  name: string;
  companies: CompanyInstance[]; // v3: 단일 company → 다중 인스턴스
  metrics: { id: string; blockId: string; x: number; y: number }[];
  formulas: FormulaInstance[]; // 커스텀 수식 노드(없으면 [])
  displays: DisplayInstance[]; // 비교/순위/필터 노드(없으면 [])
  edges: { id: string; source: string; target: string }[];
  color?: PageColor; // 라벨용 색(선택)
  icon?: string; // 라벨용 이모지 1자(선택)
}

// 구 저장본의 compares[](비교만) → displays[](kind="compare")로 변환.
function legacyCompares(o: Record<string, unknown>): DisplayInstance[] {
  if (Array.isArray(o.displays)) return o.displays as DisplayInstance[];
  if (Array.isArray(o.compares))
    return (o.compares as { id: string; x: number; y: number }[]).map((c) => ({
      id: c.id,
      kind: "compare" as const,
      x: c.x,
      y: c.y,
    }));
  return [];
}

// 멀티페이지 캔버스(v3). graph jsonb 에 통째로 저장.
export interface LabGraph {
  version: 3;
  pages: PageGraph[];
  activeId: string;
}

// v2 페이지(단일 companyId/companyPos) → v3 페이지(companies[])로 변환.
// 엣지의 source "company" 는 마이그레이션된 단일 인스턴스 "c_1" 로 리매핑.
function migratePageV2(p: unknown): PageGraph {
  const o = (p ?? {}) as Record<string, unknown>;
  const companyId = typeof o.companyId === "string" ? o.companyId : "";
  const pos = (o.companyPos as { x: number; y: number } | undefined) ?? {
    x: 80,
    y: 200,
  };
  const rawEdges = (o.edges as PageGraph["edges"]) ?? [];
  const edges = rawEdges.map((e) => ({
    id: e.id,
    source: e.source === "company" ? "c_1" : e.source,
    target: e.target,
  }));
  return {
    id: typeof o.id === "string" ? o.id : "p1",
    name: typeof o.name === "string" ? o.name : "페이지 1",
    companies: [{ id: "c_1", companyId, x: pos.x, y: pos.y }],
    metrics: (o.metrics as PageGraph["metrics"]) ?? [],
    formulas: Array.isArray(o.formulas)
      ? (o.formulas as PageGraph["formulas"])
      : [],
    displays: legacyCompares(o),
    edges,
    color: o.color as PageColor | undefined,
    icon: typeof o.icon === "string" ? o.icon : undefined,
  };
}

// v3 페이지 방어적 정규화 — companies 배열이 없으면 v2 취급.
// companies 가 있어도 metrics/edges 누락 시 기본값을 채워 hydrate 크래시 방지.
function ensureV3(p: unknown): PageGraph {
  const o = (p ?? {}) as Record<string, unknown>;
  if (Array.isArray(o.companies)) {
    return {
      id: typeof o.id === "string" ? o.id : "p1",
      name: typeof o.name === "string" ? o.name : "페이지",
      companies: o.companies as PageGraph["companies"],
      metrics: Array.isArray(o.metrics)
        ? (o.metrics as PageGraph["metrics"])
        : [],
      formulas: Array.isArray(o.formulas)
        ? (o.formulas as PageGraph["formulas"])
        : [],
      displays: legacyCompares(o),
      edges: Array.isArray(o.edges) ? (o.edges as PageGraph["edges"]) : [],
      color: o.color as PageColor | undefined,
      icon: typeof o.icon === "string" ? o.icon : undefined,
    };
  }
  return migratePageV2(o);
}

// 페이지 id 중복 치유 — 과거 버그로 저장본에 같은 id가 섞이면 React key 충돌로
// 삭제가 엉뚱하게 동작/롤백한다. 중복은 새 고유 id로 재발급(첫 등장은 유지).
function dedupePageIds(pages: PageGraph[]): PageGraph[] {
  const seen = new Set<string>();
  let counter = 1;
  return pages.map((p) => {
    if (!seen.has(p.id)) {
      seen.add(p.id);
      return p;
    }
    let id = `pg_fix_${counter++}`;
    while (seen.has(id)) id = `pg_fix_${counter++}`;
    seen.add(id);
    return { ...p, id };
  });
}

// 구버전(v1 단일, v2 멀티) → v3 로 정규화. 잘못된 형태는 null.
function normalize(raw: unknown): LabGraph | null {
  if (!raw || typeof raw !== "object") return null;
  const g = raw as Record<string, unknown>;

  // v3
  if (g.version === 3 && Array.isArray(g.pages) && g.pages.length > 0) {
    const pages = dedupePageIds(g.pages.map(ensureV3));
    const activeId =
      typeof g.activeId === "string" && pages.some((p) => p.id === g.activeId)
        ? (g.activeId as string)
        : pages[0]!.id;
    return { version: 3, pages, activeId };
  }

  // v2: { version:2, pages:[{companyId,...}] }
  if (g.version === 2 && Array.isArray(g.pages) && g.pages.length > 0) {
    const pages = dedupePageIds(g.pages.map(migratePageV2));
    const activeId =
      typeof g.activeId === "string" && pages.some((p) => p.id === g.activeId)
        ? (g.activeId as string)
        : pages[0]!.id;
    return { version: 3, pages, activeId };
  }

  // v1: { companyId, companyPos, metrics, edges }
  if (typeof g.companyId === "string") {
    const page = migratePageV2({
      id: "p1",
      name: "페이지 1",
      companyId: g.companyId,
      companyPos: g.companyPos,
      metrics: g.metrics,
      edges: g.edges,
    });
    return { version: 3, pages: [page], activeId: "p1" };
  }

  return null;
}

// 로드 결과 — error=true 면 일시적 오류/손상이므로 호출자는 자동저장으로 덮어쓰면 안 된다.
// error=false + graph=null 은 '아직 캔버스 없음(정상 신규 사용자)'.
export interface LoadResult {
  graph: LabGraph | null;
  error: boolean;
}

export async function loadLabGraph(): Promise<LoadResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { graph: null, error: false };

  const { data, error } = await supabase
    .from("lab_canvases")
    .select("graph")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return { graph: null, error: true }; // 일시적 오류 — 덮어쓰기 금지
  if (!data) return { graph: null, error: false }; // 신규 사용자(정상)
  const graph = normalize(data.graph);
  if (!graph) return { graph: null, error: true }; // 저장본 손상 — 덮어쓰기 금지
  return { graph, error: false };
}

export async function saveLabGraph(graph: LabGraph): Promise<boolean> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from("lab_canvases")
    .upsert({ user_id: user.id, graph }, { onConflict: "user_id" });

  return !error;
}
