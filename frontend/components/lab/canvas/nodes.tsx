import { createContext, useContext, useMemo, useState } from "react";
import {
  Handle,
  useNodeConnections,
  useNodesData,
  useReactFlow,
  type HandleType,
  type NodeProps,
} from "@xyflow/react";
import { Position } from "@xyflow/react";
import {
  Lock,
  Table2,
  ListOrdered,
  Filter as FilterIcon,
  Search,
  Calculator,
} from "lucide-react";
import {
  getBlock,
  getCompany,
  computeFormula,
  FORMULA_FIELDS,
  FORMULA_OPS,
  FORMULA_OP_LABEL,
  type Company,
  type FormulaOp,
  type Tone,
} from "@/lib/lab/data";
import { handleId, PORT_COLOR, type PortType } from "@/lib/lab/ports";
import type { NodeOutput, FilterOp } from "@/lib/lab/evaluate";

// 캔버스 단위 상태를 노드에 내려주는 컨텍스트.
// proUnlocked: Pro 잠금 해제 / outputs: 디스플레이 평가결과 / openCompanySearch: 기업 검색 모달 열기.
export const LabUiContext = createContext<{
  proUnlocked: boolean;
  outputs: Map<string, NodeOutput>;
  openCompanySearch: (nodeId: string) => void;
  requestUpgrade: () => void;
}>({
  proUnlocked: false,
  outputs: new Map(),
  openCompanySearch: () => {},
  requestUpgrade: () => {},
});

export type FilterNodeData = {
  op: FilterOp;
  value: number;
};
export type FormulaNodeData = {
  a: string;
  op: FormulaOp;
  b: string;
  name?: string;
};

export type CompanyNodeData = {
  companyId: string;
};
export type MetricNodeData = {
  blockId: string;
};

const TONE_DOT: Record<Tone, string> = {
  good: "bg-regime-on",
  neutral: "bg-regime-neutral",
  watch: "bg-regime-off",
};
const TONE_LABEL: Record<Tone, string> = {
  good: "양호",
  neutral: "보통",
  watch: "주의",
};

const SIDES = [
  { pos: Position.Top, key: "t" },
  { pos: Position.Right, key: "r" },
  { pos: Position.Bottom, key: "b" },
  { pos: Position.Left, key: "l" },
] as const;
// 지표 입력용 — 우측은 출력핸들 자리라 제외(상/좌/하).
const SIDES_NO_RIGHT = SIDES.filter((s) => s.key !== "r");

// 4면 핸들 — 평소엔 숨김(opacity-0), 노드에 마우스가 다가오면(hover) 등장.
// handle id에 포트 타입을 인코딩 → isValidConnection이 타입으로 연결을 검증.
// sides 로 일부 면만 노출 가능(지표 입력은 출력핸들과 겹치지 않게 우측 제외).
function SideHandles({
  type,
  portType,
  sides = SIDES,
}: {
  type: HandleType;
  portType: PortType;
  sides?: typeof SIDES | (typeof SIDES)[number][];
}) {
  const dir = type === "source" ? "out" : "in";
  return (
    <>
      {sides.map((s) => (
        <Handle
          key={s.key}
          id={handleId(dir, portType, s.key)}
          type={type}
          position={s.pos}
          className={
            "!h-2.5 !w-2.5 !min-h-0 !min-w-0 !rounded-full !border-2 !border-background opacity-0 transition-opacity duration-150 group-hover:opacity-100 " +
            PORT_COLOR[portType]
          }
        />
      ))}
    </>
  );
}

// 잠긴 블록 미리보기 — 결핍 사다리(docs/07 §9). 실제 값은 노출하지 않고(누출 차단),
// 흐릿한 더미로 '여기 분석이 있다'는 호기심 갭만 주고 '펼쳐보기'로 업그레이드 유도.
// 철학 가드: '사세요'/카운트다운 금지 — 초대 톤. requestUpgrade 가 업그레이드 모달을 연다.
function LockedPreview({ label = "Pro" }: { label?: string }) {
  const { requestUpgrade } = useContext(LabUiContext);
  return (
    <div className="relative">
      <div aria-hidden className="select-none space-y-1 opacity-50 blur-[3px]">
        {["●●●●", "●●●", "●●●●"].map((s, i) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{s}</span>
            <span className="font-semibold tabular-nums">██.█</span>
          </div>
        ))}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Lock className="h-3 w-3" aria-hidden /> {label} 분석
        </span>
        <button
          type="button"
          onClick={requestUpgrade}
          className="nodrag rounded-md bg-regime-on/15 px-2 py-0.5 text-[11px] font-medium text-foreground transition-colors hover:bg-regime-on/25"
        >
          펼쳐보기
        </button>
      </div>
    </div>
  );
}

// 기업 블록 — 분석 대상. 4면에서 지표로 연결. 클릭하면 기업 검색 모달로 선택.
function CompanyNodeView({ id, data, selected }: NodeProps) {
  const d = data as CompanyNodeData;
  const { openCompanySearch } = useContext(LabUiContext);
  const company = getCompany(d.companyId) ?? null;
  return (
    <div
      className={
        "group h-24 w-48 overflow-hidden rounded-xl border-2 border-regime-on/40 bg-card p-3 shadow-sm " +
        (selected ? "ring-2 ring-regime-on/70" : "")
      }
    >
      <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        기업
      </p>
      <button
        type="button"
        onClick={() => openCompanySearch(id)}
        className="nodrag flex w-full items-center justify-between gap-1 rounded-md border border-border bg-background px-2 py-1.5 text-sm transition-colors hover:bg-surface-2"
      >
        <span className="min-w-0 truncate text-left">
          {company ? (
            <>
              {company.name}{" "}
              <span className="text-xs text-muted-foreground">
                · {company.ticker}
              </span>
            </>
          ) : (
            <span className="text-muted-foreground">기업 검색…</span>
          )}
        </span>
        <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
      </button>
      {company?.period ? (
        <p className="mt-1 truncate text-[10px] text-muted-foreground">
          {company.period} 기준 · DART
        </p>
      ) : null}
      <SideHandles type="source" portType="Company" />
    </div>
  );
}

// 지표 블록 — 연결된 기업들을 반응형으로 읽어 기업별 행("회사명 + 값")으로 출력.
function MetricNodeView({ data, selected }: NodeProps) {
  const d = data as MetricNodeData;
  const { proUnlocked } = useContext(LabUiContext);
  // 이 노드(target)로 들어오는 연결 → 소스(기업) 노드 데이터를 구독.
  const connections = useNodeConnections({ handleType: "target" });
  const sourceIds = useMemo(
    () => Array.from(new Set(connections.map((c) => c.source))),
    [connections],
  );
  const sources = useNodesData(sourceIds);

  const block = getBlock(d.blockId);
  if (!block) return null;
  const locked = Boolean(block.pro) && !proUnlocked;

  const companies: Company[] = sources
    .filter((s) => s?.type === "company")
    .map((s) => getCompany((s!.data as CompanyNodeData).companyId))
    .filter((c): c is Company => Boolean(c));

  return (
    <div
      className={
        "group min-h-[8rem] w-48 rounded-xl border border-border bg-card p-3 shadow-sm " +
        (selected ? "ring-2 ring-regime-on/70" : "")
      }
    >
      <SideHandles type="target" portType="Company" sides={SIDES_NO_RIGHT} />
      {/* 출력 포트(우측) — 비교 표 등 다운스트림 블록으로 값 전달. */}
      <Handle
        id={handleId("out", "NumberList", "r")}
        type="source"
        position={Position.Right}
        className={
          "!h-2.5 !w-2.5 !min-h-0 !min-w-0 !rounded-full !border-2 !border-background opacity-0 transition-opacity duration-150 group-hover:opacity-100 " +
          PORT_COLOR.NumberList
        }
      />
      <p className="flex items-center gap-1.5 text-sm font-medium">
        {block.name}
        {block.pro ? (
          <span className="rounded bg-muted px-1 py-0.5 text-[10px] text-muted-foreground">
            Pro
          </span>
        ) : null}
      </p>
      <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
        {block.explanation}
      </p>
      <div className="mt-2 rounded-md border border-border bg-background px-2.5 py-1.5 text-sm">
        {locked ? (
          <LockedPreview label="Pro" />
        ) : companies.length === 0 ? (
          <span className="text-muted-foreground">기업 블록을 연결하세요</span>
        ) : (
          <ul className="space-y-1">
            {companies.map((c) => {
              const r = block.compute(c);
              return (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                    {c.name}
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    <span className="font-semibold tabular-nums">
                      {r.display}
                    </span>
                    <span
                      className={"h-2 w-2 rounded-full " + TONE_DOT[r.tone]}
                      aria-hidden
                      title={TONE_LABEL[r.tone]}
                    />
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

// 비교 표(Display) — 연결된 지표들의 출력을 기업 × 지표 표로 모으는 sink.
function CompareNodeView({ id, selected }: NodeProps) {
  const { outputs } = useContext(LabUiContext);
  const raw = outputs.get(id);
  const out = raw && raw.kind === "compare" ? raw : null;

  return (
    <div
      className={
        "group min-h-[8rem] w-72 rounded-xl border-2 border-border bg-card p-3 shadow-sm " +
        (selected ? "ring-2 ring-regime-on/70" : "")
      }
    >
      <SideHandles type="target" portType="NumberList" />
      <p className="mb-2 flex items-center gap-1.5 text-sm font-medium">
        <Table2 className="h-4 w-4 text-regime-on" aria-hidden /> 비교 표
      </p>
      {!out || out.empty ? (
        <p className="text-xs text-muted-foreground">
          지표 블록의 출력(오른쪽 점)을 연결하면 기업별로 비교해 드려요.
        </p>
      ) : out.rows.length === 0 ? (
        out.columns.some((c) => c.locked) ? (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="h-3 w-3" aria-hidden /> 연결된 지표가 Pro예요. Pro로
            보거나 무료 지표를 연결하세요.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            연결된 지표에 기업이 없어요. 기업 블록을 지표에 먼저 연결하세요.
          </p>
        )
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                <th className="px-1.5 py-1 text-left font-medium text-muted-foreground">
                  기업
                </th>
                {out.columns.map((col, i) => (
                  <th
                    key={i}
                    className="px-1.5 py-1 text-right font-medium"
                  >
                    {col.locked ? (
                      <span className="inline-flex items-center gap-0.5 text-muted-foreground">
                        <Lock className="h-3 w-3" aria-hidden />
                        {col.name}
                      </span>
                    ) : (
                      col.name
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {out.rows.map((row) => (
                <tr key={row.id} className="border-t border-border">
                  <td className="max-w-[6rem] truncate px-1.5 py-1 text-left text-muted-foreground">
                    {row.name}
                  </td>
                  {row.values.map((v, i) => {
                    const locked = out.columns[i]?.locked;
                    return (
                      <td
                        key={i}
                        className="px-1.5 py-1 text-right tabular-nums"
                      >
                        {locked ? (
                          <Lock
                            className="inline h-3 w-3 text-muted-foreground"
                            aria-hidden
                          />
                        ) : v ? (
                          <span className="inline-flex items-center justify-end gap-1">
                            {v.display}
                            <span
                              className={
                                "h-1.5 w-1.5 rounded-full " + TONE_DOT[v.tone]
                              }
                              aria-hidden
                              title={TONE_LABEL[v.tone]}
                            />
                          </span>
                        ) : (
                          "–"
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// 순위(Aggregate) — 연결된 첫 지표 기준으로 기업을 정렬해 1·2·3위로.
function RankNodeView({ id, selected }: NodeProps) {
  const { proUnlocked, outputs } = useContext(LabUiContext);
  const raw = outputs.get(id);
  const out = raw && raw.kind === "rank" ? raw : null;

  return (
    <div
      className={
        "group min-h-[8rem] w-56 rounded-xl border-2 border-border bg-card p-3 shadow-sm " +
        (selected ? "ring-2 ring-regime-on/70" : "")
      }
    >
      <SideHandles type="target" portType="NumberList" />
      <p className="mb-2 flex items-center gap-1.5 text-sm font-medium">
        <ListOrdered className="h-4 w-4 text-regime-on" aria-hidden /> 순위
        <span className="rounded bg-muted px-1 py-0.5 text-[10px] text-muted-foreground">
          Pro
        </span>
        {proUnlocked && out && out.metricName ? (
          <span className="truncate text-xs font-normal text-muted-foreground">
            · {out.metricName}
          </span>
        ) : null}
      </p>
      {!proUnlocked ? (
        <LockedPreview label="Pro" />
      ) : !out || out.empty ? (
        <p className="text-xs text-muted-foreground">
          지표 블록의 출력(오른쪽 점)을 연결하면 순위를 매겨 드려요.
        </p>
      ) : (
        <>
          {out.multi ? (
            <p className="mb-1 text-[10px] text-muted-foreground">
              여러 지표 중 첫 번째 기준이에요.
            </p>
          ) : null}
          <ol className="space-y-1">
            {out.items.map((it) => (
              <li
                key={it.companyId}
                className="flex items-center gap-2 text-sm"
              >
                <span className="w-4 shrink-0 text-center text-xs font-semibold text-muted-foreground">
                  {it.rank}
                </span>
                <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                  {it.name}
                </span>
                <span className="flex shrink-0 items-center gap-1.5">
                  <span className="font-semibold tabular-nums">
                    {it.display}
                  </span>
                  <span
                    className={"h-2 w-2 rounded-full " + TONE_DOT[it.tone]}
                    aria-hidden
                    title={TONE_LABEL[it.tone]}
                  />
                </span>
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}

// 필터/스크리너(Filter) — 연결된 첫 지표가 조건(≥/≤ 값)을 만족하는 기업만 통과.
function FilterNodeView({ id, data, selected }: NodeProps) {
  const { proUnlocked, outputs } = useContext(LabUiContext);
  const { updateNodeData } = useReactFlow();
  const d = data as FilterNodeData;
  const raw = outputs.get(id);
  const out = raw && raw.kind === "filter" ? raw : null;
  // 값 입력은 로컬 string으로 보관 → "1.5" 등 소수점 중간상태 입력 가능. 유한값일 때만 커밋.
  const [valueText, setValueText] = useState(() => String(d.value ?? 0));

  return (
    <div
      className={
        "group min-h-[8rem] w-56 rounded-xl border-2 border-border bg-card p-3 shadow-sm " +
        (selected ? "ring-2 ring-regime-on/70" : "")
      }
    >
      <SideHandles type="target" portType="NumberList" />
      <p className="mb-2 flex items-center gap-1.5 text-sm font-medium">
        <FilterIcon className="h-4 w-4 text-regime-on" aria-hidden /> 필터
        <span className="rounded bg-muted px-1 py-0.5 text-[10px] text-muted-foreground">
          Pro
        </span>
        {proUnlocked && out && out.metricName ? (
          <span className="truncate text-xs font-normal text-muted-foreground">
            · {out.metricName}
          </span>
        ) : null}
      </p>
      {!proUnlocked ? (
        <LockedPreview label="Pro" />
      ) : (
        <>
          {/* 조건 입력 — 지표 ≥/≤ 값 */}
          <div className="mb-2 flex items-center gap-1">
            <select
              className="nodrag rounded-md border border-border bg-background px-1.5 py-1 text-xs"
              value={d.op}
              onChange={(e) =>
                updateNodeData(id, {
                  op: e.target.value === "lte" ? "lte" : "gte",
                })
              }
            >
              <option value="gte">이상 ≥</option>
              <option value="lte">이하 ≤</option>
            </select>
            <input
              type="number"
              step="any"
              className="nodrag w-16 rounded-md border border-border bg-background px-1.5 py-1 text-xs tabular-nums"
              value={valueText}
              onChange={(e) => {
                setValueText(e.target.value);
                const n = parseFloat(e.target.value);
                if (Number.isFinite(n)) updateNodeData(id, { value: n });
              }}
            />
          </div>
          {!out || out.empty ? (
            <p className="text-xs text-muted-foreground">
              지표 블록의 출력(오른쪽 점)을 연결하세요.
            </p>
          ) : (
            <>
              <p className="mb-1 text-[10px] text-muted-foreground">
                통과 {out.passCount}/{out.items.length}
              </p>
              <ul className="space-y-1">
                {out.items.map((it) => (
                  <li
                    key={it.companyId}
                    className={
                      "flex items-center justify-between gap-2 text-sm " +
                      (it.pass ? "" : "opacity-40")
                    }
                  >
                    <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                      {it.pass ? "✓ " : "· "}
                      {it.name}
                    </span>
                    <span className="shrink-0 font-semibold tabular-nums">
                      {it.display}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  );
}

// 커스텀 수식(Quant·현재 Pro 게이팅) — 두 재무필드를 사칙연산으로 조합해 기업별 값 산출.
// 빌더(필드/연산 선택)는 잠겨도 노출(설정 허용), 결과 값만 게이팅(read-allowed, run-gated).
function FormulaNodeView({ id, data, selected }: NodeProps) {
  const d = data as FormulaNodeData;
  const { proUnlocked } = useContext(LabUiContext);
  const { updateNodeData } = useReactFlow();
  const connections = useNodeConnections({ handleType: "target" });
  const sourceIds = useMemo(
    () => Array.from(new Set(connections.map((c) => c.source))),
    [connections],
  );
  const sources = useNodesData(sourceIds);
  const companies: Company[] = sources
    .filter((s) => s?.type === "company")
    .map((s) => getCompany((s!.data as CompanyNodeData).companyId))
    .filter((c): c is Company => Boolean(c));

  const sel =
    "nodrag min-w-0 flex-1 rounded-md border border-border bg-background px-1 py-1 text-xs";

  return (
    <div
      className={
        "group min-h-[8rem] w-56 rounded-xl border-2 border-border bg-card p-3 shadow-sm " +
        (selected ? "ring-2 ring-regime-on/70" : "")
      }
    >
      <SideHandles type="target" portType="Company" sides={SIDES_NO_RIGHT} />
      <Handle
        id={handleId("out", "NumberList", "r")}
        type="source"
        position={Position.Right}
        className={
          "!h-2.5 !w-2.5 !min-h-0 !min-w-0 !rounded-full !border-2 !border-background opacity-0 transition-opacity duration-150 group-hover:opacity-100 " +
          PORT_COLOR.NumberList
        }
      />
      <p className="mb-2 flex items-center gap-1.5 text-sm font-medium">
        <Calculator className="h-4 w-4 text-regime-on" aria-hidden /> 커스텀 수식
        <span className="rounded bg-muted px-1 py-0.5 text-[10px] text-muted-foreground">
          Pro
        </span>
      </p>
      {/* 수식 빌더(잠겨도 설정 가능) */}
      <div className="mb-2 flex items-center gap-1">
        <select
          className={sel}
          value={d.a}
          onChange={(e) => updateNodeData(id, { a: e.target.value })}
        >
          {FORMULA_FIELDS.map((f) => (
            <option key={f.key} value={f.key}>
              {f.label}
            </option>
          ))}
        </select>
        <select
          className="nodrag w-9 shrink-0 rounded-md border border-border bg-background px-0 py-1 text-center text-xs"
          value={d.op}
          onChange={(e) => updateNodeData(id, { op: e.target.value })}
        >
          {FORMULA_OPS.map((o) => (
            <option key={o} value={o}>
              {FORMULA_OP_LABEL[o]}
            </option>
          ))}
        </select>
        <select
          className={sel}
          value={d.b}
          onChange={(e) => updateNodeData(id, { b: e.target.value })}
        >
          {FORMULA_FIELDS.map((f) => (
            <option key={f.key} value={f.key}>
              {f.label}
            </option>
          ))}
        </select>
      </div>
      {!proUnlocked ? (
        <LockedPreview label="Pro" />
      ) : companies.length === 0 ? (
        <p className="text-xs text-muted-foreground">기업 블록을 연결하세요</p>
      ) : (
        <ul className="space-y-1">
          {companies.map((c) => {
            const v = computeFormula(c, d.a, d.op, d.b);
            return (
              <li key={c.id} className="flex items-center justify-between gap-2">
                <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                  {c.name}
                </span>
                <span className="shrink-0 font-semibold tabular-nums">
                  {v === null ? "–" : v.toFixed(2)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export const nodeTypes = {
  company: CompanyNodeView,
  metric: MetricNodeView,
  compare: CompareNodeView,
  rank: RankNodeView,
  filter: FilterNodeView,
  formula: FormulaNodeView,
};
