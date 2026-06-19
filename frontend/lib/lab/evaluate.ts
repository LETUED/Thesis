// 조립 분석 캔버스의 DAG 평가 — docs/06 §6.
// 슬라이스2: 깊이 고정(기업 → 지표 → 디스플레이[비교/순위/필터]) 패스 평가.
// 범용 위상정렬은 체이닝이 깊어질 때 도입. 디스플레이 노드의 출력만 산출하며,
// 지표 행은 내부에서 계산. 잠긴(Pro) 지표는 값 노출 금지(locked + 빈 행).

import {
  getBlock,
  getCompany,
  computeFormula,
  fieldLabel,
  type Company,
  type FormulaOp,
  type Tone,
} from "./data";

export interface MetricRow {
  companyId: string;
  name: string;
  value: number | null;
  display: string;
  tone: Tone;
}

// ── 비교 표 ──────────────────────────────────────────────
export interface CompareColumn {
  blockId: string;
  name: string;
  locked: boolean;
}
export interface CompareRow {
  id: string;
  name: string;
  values: (MetricRow | null)[]; // columns 순서에 정렬
}
export interface CompareOutput {
  kind: "compare";
  columns: CompareColumn[];
  rows: CompareRow[];
  empty: boolean;
}

// ── 순위 ────────────────────────────────────────────────
export interface RankItem {
  rank: number;
  companyId: string;
  name: string;
  display: string;
  tone: Tone;
}
export interface RankOutput {
  kind: "rank";
  metricName: string;
  locked: boolean;
  empty: boolean;
  multi: boolean; // 지표 여러 개 연결됨(첫 지표 기준 안내)
  items: RankItem[];
}

// ── 필터/스크리너 ────────────────────────────────────────
export type FilterOp = "gte" | "lte";
export interface FilterItem {
  companyId: string;
  name: string;
  display: string;
  tone: Tone;
  pass: boolean;
}
export interface FilterOutput {
  kind: "filter";
  metricName: string;
  locked: boolean;
  empty: boolean;
  op: FilterOp;
  value: number;
  items: FilterItem[];
  passCount: number;
}

export type NodeOutput = CompareOutput | RankOutput | FilterOutput;

export interface EvalNode {
  id: string;
  type?: string;
  data: Record<string, unknown>;
}
export interface EvalEdge {
  source: string;
  target: string;
}

function companyIdOf(n: EvalNode): string {
  const v = n.data.companyId;
  return typeof v === "string" ? v : "";
}
function blockIdOf(n: EvalNode): string {
  const v = n.data.blockId;
  return typeof v === "string" ? v : "";
}

interface MetricColumn {
  blockId: string;
  name: string;
  locked: boolean;
  higherIsBetter: boolean;
  rows: MetricRow[];
}

export function evaluateDisplays(
  nodes: EvalNode[],
  edges: EvalEdge[],
  proUnlocked: boolean,
): Map<string, NodeOutput> {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const incoming = (id: string) =>
    edges.filter((e) => e.target === id).map((e) => e.source);

  // value-source 노드(지표/수식)에 연결된 기업들.
  const connectedCompanies = (nodeId: string): Company[] =>
    incoming(nodeId)
      .map((sid) => byId.get(sid))
      .filter((s): s is EvalNode => Boolean(s) && s!.type === "company")
      .map((s) => getCompany(companyIdOf(s)))
      .filter((c): c is Company => Boolean(c));

  const metricColumn = (metricNode: EvalNode): MetricColumn => {
    const blockId = blockIdOf(metricNode);
    const block = getBlock(blockId);
    if (!block)
      return { blockId, name: blockId, locked: false, higherIsBetter: true, rows: [] };
    const higherIsBetter = block.higherIsBetter ?? true;
    if (Boolean(block.pro) && !proUnlocked)
      return { blockId, name: block.name, locked: true, higherIsBetter, rows: [] };
    const rows: MetricRow[] = connectedCompanies(metricNode.id).map((c) => {
      const r = block.compute(c);
      return {
        companyId: c.id,
        name: c.name,
        value: r.value,
        display: r.display,
        tone: r.tone,
      };
    });
    return { blockId, name: block.name, locked: false, higherIsBetter, rows };
  };

  // 커스텀 수식 노드(Quant·현재 Pro 게이팅) → a op b 를 기업별 broadcast.
  const formulaColumn = (node: EvalNode): MetricColumn => {
    const a = typeof node.data.a === "string" ? node.data.a : "";
    const b = typeof node.data.b === "string" ? node.data.b : "";
    const op = (node.data.op as FormulaOp) ?? "/";
    const nm = typeof node.data.name === "string" && node.data.name
      ? node.data.name
      : `${fieldLabel(a)}${op}${fieldLabel(b)}`;
    if (!proUnlocked)
      return { blockId: node.id, name: nm, locked: true, higherIsBetter: true, rows: [] };
    const rows: MetricRow[] = connectedCompanies(node.id).map((c) => {
      const v = computeFormula(c, a, op, b);
      return {
        companyId: c.id,
        name: c.name,
        value: v,
        display: v === null ? "-" : v.toFixed(2),
        tone: "neutral" as Tone,
      };
    });
    return { blockId: node.id, name: nm, locked: false, higherIsBetter: true, rows };
  };

  const valueColumn = (node: EvalNode): MetricColumn =>
    node.type === "formula" ? formulaColumn(node) : metricColumn(node);

  // 디스플레이로 들어오는 값-소스(지표/수식) 컬럼들(연결 순서).
  const metricCols = (displayId: string): MetricColumn[] =>
    incoming(displayId)
      .map((sid) => byId.get(sid))
      .filter(
        (m): m is EvalNode =>
          Boolean(m) && (m!.type === "metric" || m!.type === "formula"),
      )
      .map(valueColumn);

  const out = new Map<string, NodeOutput>();

  for (const n of nodes) {
    if (n.type === "compare") {
      const cols = metricCols(n.id);
      const compMap = new Map<string, string>();
      for (const col of cols)
        for (const r of col.rows)
          if (!compMap.has(r.companyId)) compMap.set(r.companyId, r.name);
      const rows: CompareRow[] = Array.from(compMap, ([id, name]) => ({
        id,
        name,
        values: cols.map(
          (col) => col.rows.find((r) => r.companyId === id) ?? null,
        ),
      }));
      out.set(n.id, {
        kind: "compare",
        columns: cols.map((c) => ({
          blockId: c.blockId,
          name: c.name,
          locked: c.locked,
        })),
        rows,
        empty: cols.length === 0,
      });
    } else if (n.type === "rank") {
      const cols = metricCols(n.id);
      const col = cols[0];
      if (!col) {
        out.set(n.id, {
          kind: "rank",
          metricName: "",
          locked: false,
          empty: true,
          multi: false,
          items: [],
        });
        continue;
      }
      // 값 있는 행 우선 정렬(방향 반영), null 은 뒤로.
      const sorted = [...col.rows].sort((a, b) => {
        if (a.value === null && b.value === null) return 0;
        if (a.value === null) return 1;
        if (b.value === null) return -1;
        return col.higherIsBetter ? b.value - a.value : a.value - b.value;
      });
      out.set(n.id, {
        kind: "rank",
        metricName: col.name,
        locked: col.locked,
        empty: col.rows.length === 0,
        multi: cols.length > 1,
        items: sorted.map((r, i) => ({
          rank: i + 1,
          companyId: r.companyId,
          name: r.name,
          display: r.display,
          tone: r.tone,
        })),
      });
    } else if (n.type === "filter") {
      const op: FilterOp = n.data.op === "lte" ? "lte" : "gte";
      const value = typeof n.data.value === "number" ? n.data.value : 0;
      const cols = metricCols(n.id);
      const col = cols[0];
      if (!col) {
        out.set(n.id, {
          kind: "filter",
          metricName: "",
          locked: false,
          empty: true,
          op,
          value,
          items: [],
          passCount: 0,
        });
        continue;
      }
      const items: FilterItem[] = col.rows.map((r) => ({
        companyId: r.companyId,
        name: r.name,
        display: r.display,
        tone: r.tone,
        pass:
          r.value === null
            ? false
            : op === "gte"
              ? r.value >= value
              : r.value <= value,
      }));
      out.set(n.id, {
        kind: "filter",
        metricName: col.name,
        locked: col.locked,
        empty: col.rows.length === 0,
        op,
        value,
        items,
        passCount: items.filter((i) => i.pass).length,
      });
    }
  }
  return out;
}
