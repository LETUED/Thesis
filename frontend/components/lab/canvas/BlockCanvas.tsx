"use client";

import "@xyflow/react/dist/style.css";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
} from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useNodesInitialized,
  addEdge,
  useReactFlow,
  MarkerType,
  type Node,
  type Edge,
  type Connection,
  type IsValidConnection,
} from "@xyflow/react";
import { useTheme } from "next-themes";
import { Menu, X, GripVertical, Plus, Lock, Store, Copy, RotateCcw } from "lucide-react";
import {
  CATEGORIES,
  blocksByCategory,
  COMPANIES,
  TEMPLATES,
  hydrateCompaniesFromApi,
  upsertCompanyFromApi,
  ensureCompanyStub,
  getCompany as resolveCompany,
  type Template,
} from "@/lib/lab/data";
import { getCompanies, getCompanyById } from "@/lib/api";
import {
  nodeTypes,
  LabUiContext,
  type MetricNodeData,
  type CompanyNodeData,
  type FilterNodeData,
  type FormulaNodeData,
} from "@/components/lab/canvas/nodes";
import { FloatingEdge } from "@/components/lab/canvas/FloatingEdge";
import { parseHandle, isCompatible } from "@/lib/lab/ports";
import { evaluateDisplays } from "@/lib/lab/evaluate";
import {
  loadLabGraph,
  saveLabGraph,
  type LabGraph,
  type PageGraph,
  type PageColor,
  type DisplayInstance,
  type DisplayKind,
} from "@/lib/lab/persistence";
import { UpgradeButton } from "@/components/billing/UpgradeButton";
import { UpgradeModal } from "@/components/billing/UpgradeModal";
import { MarketDrawer } from "@/components/lab/market/MarketDrawer";
import { CompanySearch } from "@/components/lab/canvas/CompanySearch";
import type { Tier } from "@/lib/types";

const DRAG_KEY = "application/thesis-block";
const COMPANY_DRAG = "__company__"; // 기업 블록 드롭 식별(메트릭 blockId 아님)
const FORMULA_DRAG = "__formula__"; // 커스텀 수식(Quant) 블록 드롭 식별
// 디스플레이 블록 드롭 식별(메트릭 blockId 아님). 값은 노드 type 과 동일.
const DISPLAY_DRAG: Record<DisplayKind, string> = {
  compare: "__compare__",
  rank: "__rank__",
  filter: "__filter__",
};
const DISPLAY_PREFIX: Record<DisplayKind, string> = {
  compare: "cmp",
  rank: "rnk",
  filter: "flt",
};
const PAGE_DRAG_KEY = "application/thesis-page"; // 탭 드래그 순서변경용
const GRID = 16; // 글로벌 격자(스냅 단위)
const FREE_PAGE_LIMIT = 1; // Free 페이지 수 상한 — 그 이상은 Pro(페이지 페이월)
const edgeTypes = { floating: FloatingEdge };
const defaultEdgeOptions = {
  type: "floating",
  markerEnd: { type: MarkerType.ArrowClosed },
};

// 페이지 라벨 색(중립 팔레트 — 신호색과 분리) / 아이콘 후보.
const PAGE_COLORS: PageColor[] = [
  "slate",
  "sky",
  "violet",
  "fuchsia",
  "teal",
  "indigo",
];
const COLOR_DOT: Record<PageColor, string> = {
  slate: "bg-slate-400",
  sky: "bg-sky-500",
  violet: "bg-violet-500",
  fuchsia: "bg-fuchsia-500",
  teal: "bg-teal-500",
  indigo: "bg-indigo-500",
};
const PAGE_EMOJIS = ["📊", "📈", "🏢", "💡", "🔎", "⭐"];

const FIRST_COMPANY = COMPANIES[0]?.id ?? "";

// 개발/테스트용 임시 등급 전환(서버 tier 무관). Quant는 아직 전용 블록이 없어 Pro와 동일 노출.
type DevTier = Tier | "quant";
const DEV_TIERS: DevTier[] = ["free", "pro", "quant"];
const DEV_TIER_LABEL: Record<DevTier, string> = {
  free: "Free",
  pro: "Pro",
  quant: "Quant",
};

const isDisplayType = (t?: string): t is DisplayKind =>
  t === "compare" || t === "rank" || t === "filter";

// 디스플레이 인스턴스 ↔ React Flow 노드 변환(필터만 op/value 파라미터 보유).
function displayToNode(d: DisplayInstance): Node {
  return {
    id: d.id,
    type: d.kind,
    position: { x: d.x, y: d.y },
    data:
      d.kind === "filter" ? { op: d.op ?? "gte", value: d.value ?? 0 } : {},
  };
}
function nodeToDisplay(n: Node): DisplayInstance {
  if (n.type === "filter") {
    const fd = n.data as FilterNodeData;
    return {
      id: n.id,
      kind: "filter",
      x: n.position.x,
      y: n.position.y,
      op: fd.op,
      value: fd.value,
    };
  }
  return {
    id: n.id,
    kind: n.type as DisplayKind,
    x: n.position.x,
    y: n.position.y,
  };
}

function emptyPage(id: string, name: string): PageGraph {
  return {
    id,
    name,
    companies: [{ id: "c_1", companyId: FIRST_COMPANY, x: 80, y: 200 }],
    metrics: [],
    formulas: [],
    displays: [],
    edges: [],
  };
}

function Inner({ tier }: { tier: Tier }) {
  const { resolvedTheme } = useTheme();
  // 임시 등급 전환(개발/테스트) — 서버 tier로 초기화, 버튼으로 free/pro/quant 전환.
  const [devTier, setDevTier] = useState<DevTier>(tier);
  const [paletteOpen, setPaletteOpen] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const [showPaywall, setShowPaywall] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false); // 잠긴 블록 '펼쳐보기' 업그레이드 모달
  const [marketOpen, setMarketOpen] = useState(false);
  const [searchNodeId, setSearchNodeId] = useState<string | null>(null);
  // 실데이터 로드 후 재계산 트리거(getCompany 가 갱신된 COMPANIES 를 읽도록).
  const [companiesVersion, setCompaniesVersion] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [deleted, setDeleted] = useState<{ page: PageGraph; index: number } | null>(
    null,
  );
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [colorPickerId, setColorPickerId] = useState<string | null>(null);
  const [newPageMenu, setNewPageMenu] = useState(false);
  const [panelTab, setPanelTab] = useState<"pages" | "blocks">("blocks");
  // 클립보드는 컴포넌트 레벨 → 페이지를 바꿔도 유지(크로스페이지 붙여넣기).
  // sources = 복사 당시 연결돼 있던 기업 노드 id들. srcPageId 와 현재 페이지가 같을 때만
  // 연결을 복원한다(노드 id가 페이지마다 재사용되므로 크로스페이지면 엉뚱한 기업에 붙는 것 방지).
  const [clipboard, setClipboard] = useState<
    {
      blockId: string;
      x: number;
      y: number;
      sources: string[];
      srcPageId: string;
    }[]
  >([]);

  const [pages, setPages] = useState<PageGraph[]>([emptyPage("p1", "페이지 1")]);
  const [activeId, setActiveId] = useState("p1");

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([
    {
      id: "c_1",
      type: "company",
      position: { x: 80, y: 200 },
      data: { companyId: FIRST_COMPANY },
    },
  ]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const { screenToFlowPosition, updateNodeData, fitView } = useReactFlow();
  const nodesInitialized = useNodesInitialized();
  // 페이지 로드/전환 직후, 노드 측정이 끝나면 블록 전체에 맞춰 화면을 정렬(재진입 줌 문제 해결).
  const wantFit = useRef(true);
  const openCompanySearch = useCallback(
    (nodeId: string) => setSearchNodeId(nodeId),
    [],
  );
  const requestUpgrade = useCallback(() => setShowUpgrade(true), []);
  // 초기/빈 페이지가 선점한 "c_1" 다음부터 발급(신규 캔버스 id 중복 방지).
  // 저장 그래프 로드 시엔 hydrate가 max+1로 덮어쓴다.
  const idRef = useRef(2);
  const pageSeq = useRef(2);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 로드 실패(일시적/손상) 시 자동저장 차단 — 빈 캔버스가 저장본을 덮어쓰지 않게.
  const loadFailed = useRef(false);
  // 항상 최신 pages 를 가리키는 ref — 콜백이 낡은 클로저로 페이지를 되살리는 것 방지.
  const pagesRef = useRef(pages);
  pagesRef.current = pages;

  const hasMetric = nodes.some((n) => n.type === "metric");
  const canAddPage = devTier !== "free" || pages.length < FREE_PAGE_LIMIT;
  // 복사/잘라내기는 지표만(기업 복제는 의미 약함), 삭제는 선택된 모든 노드 대상.
  const selectedCount = nodes.filter(
    (n) => n.selected && n.type === "metric",
  ).length;
  const selectedNodeCount = nodes.filter((n) => n.selected).length;
  // Pro 블록 해제 여부 — 임시 등급(devTier)이 free가 아니면 해제. (Quant 전용 블록은 아직 없음)
  const effectiveProUnlocked = devTier !== "free";

  // DAG 평가 — 비교 표 출력 산출. 구조(노드 종류/연결/잠금)가 바뀔 때만 재계산(드래그 제외).
  const evalSig = useMemo(() => {
    const ns = nodes
      .map((n) =>
        n.type === "company"
          ? `c:${n.id}:${(n.data as CompanyNodeData).companyId}`
          : n.type === "metric"
            ? `m:${n.id}:${(n.data as MetricNodeData).blockId}`
            : n.type === "filter"
              ? `f:${n.id}:${(n.data as FilterNodeData).op}:${(n.data as FilterNodeData).value}`
              : n.type === "formula"
                ? `fm:${n.id}:${(n.data as FormulaNodeData).a}:${(n.data as FormulaNodeData).op}:${(n.data as FormulaNodeData).b}:${(n.data as FormulaNodeData).name ?? ""}`
                : `x:${n.type}:${n.id}`,
      )
      .join("|");
    const es = edges.map((e) => `${e.source}>${e.target}`).join("|");
    return `${ns}#${es}#${effectiveProUnlocked}#${companiesVersion}`;
  }, [nodes, edges, effectiveProUnlocked, companiesVersion]);

  const outputs = useMemo(
    () => evaluateDisplays(nodes, edges, effectiveProUnlocked),
    // evalSig가 구조 변경을 대표 → 위치 변경(드래그)에는 재계산하지 않음.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [evalSig],
  );

  // 컨텍스트 값 메모 — 드래그/저장상태 변화 때 노드가 불필요하게 리렌더되지 않게.
  const labCtx = useMemo(
    () => ({
      proUnlocked: effectiveProUnlocked,
      outputs,
      openCompanySearch,
      requestUpgrade,
    }),
    [effectiveProUnlocked, outputs, openCompanySearch, requestUpgrade],
  );

  // 페이지 → 라이브 노드/엣지로 펼치기.
  const hydrate = useCallback(
    (pg: PageGraph) => {
      setNodes([
        ...pg.companies.map((c) => ({
          id: c.id,
          type: "company",
          position: { x: c.x, y: c.y },
          data: { companyId: c.companyId },
        })),
        ...pg.metrics.map((m) => ({
          id: m.id,
          type: "metric",
          position: { x: m.x, y: m.y },
          data: { blockId: m.blockId },
        })),
        ...pg.formulas.map((f) => ({
          id: f.id,
          type: "formula",
          position: { x: f.x, y: f.y },
          data: { a: f.a, op: f.op, b: f.b, name: f.name },
        })),
        ...pg.displays.map(displayToNode),
      ]);
      setEdges(
        pg.edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          type: "floating",
          animated: true,
        })),
      );
      // id 카운터 = 회사/지표/디스플레이 노드 id의 최대 숫자 +1 (충돌 방지).
      const ids = [
        ...pg.companies.map((c) => c.id),
        ...pg.metrics.map((m) => m.id),
        ...pg.formulas.map((f) => f.id),
        ...pg.displays.map((d) => d.id),
      ];
      const maxId = ids.reduce((mx, id) => {
        const n = Number(id.replace(/^[a-z]+_/, ""));
        return Number.isFinite(n) && n > mx ? n : mx;
      }, 0);
      idRef.current = maxId + 1;
      wantFit.current = true; // 하이드레이트 후 측정되면 화면 맞춤
    },
    [setNodes, setEdges],
  );

  // 노드 측정 완료 + 맞춤 요청 시 블록 전체에 맞게 뷰포트 정렬(로드/페이지전환/재진입).
  useEffect(() => {
    if (nodesInitialized && wantFit.current) {
      wantFit.current = false;
      fitView({ padding: 0.2, duration: 200, maxZoom: 1.5 });
    }
  }, [nodesInitialized, fitView]);

  // 라이브 노드/엣지 → 현재 페이지 직렬화. 색/아이콘은 기존 페이지 값 보존.
  const serializeActive = useCallback((): PageGraph => {
    const prev = pages.find((p) => p.id === activeId);
    return {
      id: activeId,
      name: prev?.name ?? "페이지",
      companies: nodes
        .filter((n) => n.type === "company")
        .map((n) => ({
          id: n.id,
          companyId: (n.data as CompanyNodeData).companyId,
          x: n.position.x,
          y: n.position.y,
        })),
      metrics: nodes
        .filter((n) => n.type === "metric")
        .map((n) => ({
          id: n.id,
          blockId: (n.data as MetricNodeData).blockId,
          x: n.position.x,
          y: n.position.y,
        })),
      formulas: nodes
        .filter((n) => n.type === "formula")
        .map((n) => {
          const fd = n.data as FormulaNodeData;
          return {
            id: n.id,
            x: n.position.x,
            y: n.position.y,
            a: fd.a,
            op: fd.op,
            b: fd.b,
            name: fd.name,
          };
        }),
      displays: nodes.filter((n) => isDisplayType(n.type)).map(nodeToDisplay),
      edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
      color: prev?.color,
      icon: prev?.icon,
    };
  }, [nodes, edges, activeId, pages]);

  // 최초: 저장된 멀티페이지 캔버스 복원.
  useEffect(() => {
    let active = true;
    void (async () => {
      const { graph: g, error } = await loadLabGraph();
      if (!active) return;
      if (g) {
        setPages(g.pages);
        setActiveId(g.activeId);
        // 페이지 카운터도 '기존 pg_N 최대값 +1'로 복원(삭제 이력으로 비연속이어도 id 충돌 방지).
        const maxPg = g.pages.reduce((mx, p) => {
          const n = Number(p.id.replace(/^pg_/, ""));
          return Number.isFinite(n) && n > mx ? n : mx;
        }, 1);
        pageSeq.current = maxPg + 1;
        const act = g.pages.find((p) => p.id === g.activeId) ?? g.pages[0]!;
        hydrate(act);
        // 저장 그래프가 참조하는 기본 4종 외 종목 → 재무 온디맨드 로드('회사 없음' 방지).
        const refIds = new Set<string>();
        for (const p of g.pages)
          for (const c of p.companies) refIds.add(c.companyId);
        const missing = [...refIds].filter((id) => id && !resolveCompany(id));
        if (missing.length) {
          void Promise.allSettled(
            missing.map((id) =>
              getCompanyById(id).then((row) => upsertCompanyFromApi(row)),
            ),
          ).then(() => {
            if (active) setCompaniesVersion((v) => v + 1);
          });
        }
      }
      loadFailed.current = error;
      setLoaded(true);
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 최초: 백엔드 실데이터로 기업 재무 교체(실패 시 mock 유지). 식별자(ISIN)는 동일.
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const rows = await getCompanies();
        if (!active) return;
        hydrateCompaniesFromApi(rows);
        setCompaniesVersion((v) => v + 1); // getCompany 재읽기 트리거
      } catch {
        // 백엔드 미가동/실패 — mock 폴백 유지(조용히).
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // 변경 디바운스 저장(전 페이지). 기업 선택은 노드 data 에 들어가 nodes 변화로 감지됨.
  useEffect(() => {
    if (!loaded || loadFailed.current) return; // 로드 실패 시 저장 금지(저장본 보호)
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveState("saving");
    saveTimer.current = setTimeout(() => {
      const graph: LabGraph = {
        version: 3,
        pages: pages.map((p) => (p.id === activeId ? serializeActive() : p)),
        activeId,
      };
      void saveLabGraph(graph).then((okSave) =>
        setSaveState(okSave ? "saved" : "idle"),
      );
    }, 800);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [nodes, edges, pages, activeId, loaded, serializeActive]);

  const switchPage = useCallback(
    (toId: string) => {
      if (toId === activeId) return;
      const current = serializeActive();
      const target = pages.find((p) => p.id === toId);
      setPages((ps) => ps.map((p) => (p.id === activeId ? current : p)));
      setActiveId(toId);
      if (target) hydrate(target);
    },
    [activeId, pages, serializeActive, hydrate],
  );

  const addPage = useCallback(() => {
    if (!canAddPage) {
      setShowPaywall(true);
      return;
    }
    const current = serializeActive();
    const n = pageSeq.current++;
    const np = emptyPage(`pg_${n}`, `페이지 ${n}`);
    setPages((ps) => ps.map((p) => (p.id === activeId ? current : p)).concat(np));
    setActiveId(np.id);
    hydrate(np);
  }, [canAddPage, serializeActive, activeId, hydrate]);

  const deletePage = useCallback(
    (id: string) => {
      // 항상 최신 pages 기준으로 계산(낡은 클로저로 지운 페이지 부활 방지).
      const ps = pagesRef.current;
      if (ps.length <= 1) return;
      const current = serializeActive();
      const merged = ps.map((p) => (p.id === activeId ? current : p));
      const index = merged.findIndex((p) => p.id === id);
      if (index < 0) return;
      const removedPage = merged[index]!;
      const remaining = merged.filter((p) => p.id !== id);
      pagesRef.current = remaining; // 같은 틱 연속 삭제 안전
      setPages(remaining);
      if (id === activeId) {
        const next = remaining[0]!;
        setActiveId(next.id);
        hydrate(next);
      }
      // 실행취소(데이터 손실 방지) — 6초간 복구 가능.
      setDeleted({ page: removedPage, index });
      if (undoTimer.current) clearTimeout(undoTimer.current);
      undoTimer.current = setTimeout(() => setDeleted(null), 6000);
    },
    [activeId, serializeActive, hydrate],
  );

  const undoDelete = useCallback(() => {
    if (!deleted) return;
    const { page, index } = deleted;
    const current = serializeActive();
    setPages((ps) => {
      const merged = ps.map((p) => (p.id === activeId ? current : p));
      const arr = [...merged];
      arr.splice(Math.min(index, arr.length), 0, page);
      return arr;
    });
    setDeleted(null);
    if (undoTimer.current) clearTimeout(undoTimer.current);
  }, [deleted, activeId, serializeActive]);

  // 페이지 복제 — 현재(또는 지정) 페이지를 깊은복사. metric/edge id 재발급(충돌 방지).
  const duplicatePage = useCallback(
    (id: string) => {
      if (!canAddPage) {
        setShowPaywall(true);
        return;
      }
      const src = id === activeId ? serializeActive() : pages.find((p) => p.id === id);
      if (!src) return;
      const idMap = new Map<string, string>();
      const companies = src.companies.map((c) => {
        const nid = `c_${idRef.current++}`;
        idMap.set(c.id, nid);
        return { id: nid, companyId: c.companyId, x: c.x, y: c.y };
      });
      const metrics = src.metrics.map((m) => {
        const nid = `m_${idRef.current++}`;
        idMap.set(m.id, nid);
        return { id: nid, blockId: m.blockId, x: m.x, y: m.y };
      });
      const formulas = src.formulas.map((f) => {
        const nid = `fml_${idRef.current++}`;
        idMap.set(f.id, nid);
        return { ...f, id: nid };
      });
      const displays = src.displays.map((d) => {
        const nid = `${DISPLAY_PREFIX[d.kind]}_${idRef.current++}`;
        idMap.set(d.id, nid);
        return { ...d, id: nid };
      });
      const newEdges = src.edges
        .filter((e) => idMap.has(e.source) && idMap.has(e.target))
        .map((e) => {
          const source = idMap.get(e.source)!;
          const target = idMap.get(e.target)!;
          return { id: `e_${source}_${target}`, source, target };
        });
      const n = pageSeq.current++;
      const copy: PageGraph = {
        id: `pg_${n}`,
        name: `${src.name} 사본`,
        companies,
        metrics,
        formulas,
        displays,
        edges: newEdges,
        color: src.color,
        icon: src.icon,
      };
      const current = serializeActive();
      setPages((ps) => ps.map((p) => (p.id === activeId ? current : p)).concat(copy));
      setActiveId(copy.id);
      hydrate(copy);
    },
    [canAddPage, activeId, pages, serializeActive, hydrate],
  );

  const setPageColor = useCallback((id: string, color: PageColor | undefined) => {
    setPages((ps) => ps.map((p) => (p.id === id ? { ...p, color } : p)));
    setColorPickerId(null);
  }, []);

  const setPageIcon = useCallback((id: string, icon: string | undefined) => {
    setPages((ps) => ps.map((p) => (p.id === id ? { ...p, icon } : p)));
    setColorPickerId(null);
  }, []);

  // 템플릿으로 새 페이지 시작 — blockIds 를 세로로 자동 배치 + 기업에 연결.
  const addPageFromTemplate = useCallback(
    (t: Template) => {
      if (!canAddPage) {
        setShowPaywall(true);
        return;
      }
      const companyNodeId = `c_${idRef.current++}`;
      const metrics = t.blockIds.map((bid, i) => ({
        id: `m_${idRef.current++}`,
        blockId: bid,
        x: 380,
        y: 100 + i * 120,
      }));
      const edges = metrics.map((m) => ({
        id: `e_${companyNodeId}_${m.id}`,
        source: companyNodeId,
        target: m.id,
      }));
      const np: PageGraph = {
        id: `pg_${pageSeq.current++}`,
        name: t.name,
        companies: [{ id: companyNodeId, companyId: FIRST_COMPANY, x: 80, y: 160 }],
        metrics,
        formulas: [],
        displays: [],
        edges,
      };
      const current = serializeActive();
      setPages((ps) => ps.map((p) => (p.id === activeId ? current : p)).concat(np));
      setActiveId(np.id);
      hydrate(np);
    },
    [canAddPage, activeId, serializeActive, hydrate],
  );

  // 탭 드래그로 순서변경(활성 페이지는 먼저 직렬화해 반영).
  const reorderPages = useCallback(
    (srcId: string, targetId: string) => {
      if (srcId === targetId) return;
      const current = serializeActive();
      setPages((ps) => {
        const merged = ps.map((p) => (p.id === activeId ? current : p));
        const from = merged.findIndex((p) => p.id === srcId);
        const to = merged.findIndex((p) => p.id === targetId);
        if (from < 0 || to < 0) return merged;
        const arr = [...merged];
        const [moved] = arr.splice(from, 1);
        if (!moved) return merged;
        arr.splice(to, 0, moved);
        return arr;
      });
    },
    [serializeActive, activeId],
  );

  const renameCommit = (id: string) => {
    const name = draftName.trim();
    if (name) {
      setPages((ps) => ps.map((p) => (p.id === id ? { ...p, name } : p)));
    }
    setEditingId(null);
  };

  // 타입드 포트 검증 — handle id에 인코딩된 타입이 호환될 때만 연결 허용.
  const isValidConnection = useCallback<IsValidConnection>((c) => {
    if (c.source === c.target) return false;
    const s = parseHandle(c.sourceHandle);
    const t = parseHandle(c.targetHandle);
    if (!s || !t) return false;
    if (s.dir !== "out" || t.dir !== "in") return false;
    return isCompatible(s.type, t.type);
  }, []);

  // 멀티-기업 fan-in: 한 지표에 기업 여러 개 연결 가능(중복 쌍만 막음).
  const onConnect = useCallback(
    (c: Connection) => {
      setEdges((eds) =>
        eds.some((e) => e.source === c.source && e.target === c.target)
          ? eds
          : addEdge({ ...c, type: "floating", animated: true }, eds),
      );
    },
    [setEdges],
  );

  const onDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      const blockId = e.dataTransfer.getData(DRAG_KEY);
      if (!blockId) return;
      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      if (blockId === COMPANY_DRAG) {
        const id = `c_${idRef.current++}`;
        setNodes((nds) =>
          nds.concat({
            id,
            type: "company",
            position,
            data: { companyId: FIRST_COMPANY },
          }),
        );
        return;
      }
      if (blockId === FORMULA_DRAG) {
        const id = `fml_${idRef.current++}`;
        setNodes((nds) =>
          nds.concat({
            id,
            type: "formula",
            position,
            data: { a: "roe", op: "/", b: "forwardPer", name: "" },
          }),
        );
        return;
      }
      const displayKind = (Object.keys(DISPLAY_DRAG) as DisplayKind[]).find(
        (k) => DISPLAY_DRAG[k] === blockId,
      );
      if (displayKind) {
        const id = `${DISPLAY_PREFIX[displayKind]}_${idRef.current++}`;
        setNodes((nds) =>
          nds.concat(
            displayToNode({ id, kind: displayKind, x: position.x, y: position.y }),
          ),
        );
        return;
      }
      const id = `m_${idRef.current++}`;
      setNodes((nds) =>
        nds.concat({ id, type: "metric", position, data: { blockId } }),
      );
    },
    [screenToFlowPosition, setNodes],
  );

  // 복사/잘라내기 — 선택된 지표 블록만(기업 블록 제외).
  const copySelection = useCallback(
    (cut: boolean) => {
      const sel = nodes.filter((n) => n.selected && n.type === "metric");
      if (sel.length === 0) return;
      setClipboard(
        sel.map((n) => ({
          blockId: (n.data as MetricNodeData).blockId,
          x: n.position.x,
          y: n.position.y,
          sources: edges
            .filter((e) => e.target === n.id)
            .map((e) => e.source),
          srcPageId: activeId,
        })),
      );
      if (cut) {
        const ids = new Set(sel.map((n) => n.id));
        setNodes((ns) => ns.filter((n) => !ids.has(n.id)));
        // 지표는 비교 노드로 나가는 출력 엣지의 source가 되므로 양방향 정리(댕글링 방지).
        setEdges((es) =>
          es.filter((e) => !ids.has(e.target) && !ids.has(e.source)),
        );
      }
    },
    [nodes, edges, activeId, setNodes, setEdges],
  );

  // 붙여넣기 — 현재(활성) 페이지에. 클립보드가 컴포넌트 레벨이라 다른 페이지에도 붙는다.
  // 연결 복원은 소스 기업 노드가 현재 페이지에 존재할 때만(크로스페이지면 자연히 미연결).
  const pasteClipboard = useCallback(() => {
    if (clipboard.length === 0) return;
    const off = GRID * 2;
    const companyIdsNow = new Set(
      nodes.filter((n) => n.type === "company").map((n) => n.id),
    );
    const created = clipboard.map((it) => ({ it, id: `m_${idRef.current++}` }));
    const added: Node[] = created.map(({ it, id }) => ({
      id,
      type: "metric",
      position: { x: it.x + off, y: it.y + off },
      data: { blockId: it.blockId },
      selected: true,
    }));
    const newEdges: Edge[] = created.flatMap(({ it, id }) =>
      // 다른 페이지로 붙여넣으면 연결 복원 안 함(노드 id가 페이지마다 재사용되므로).
      (it.srcPageId === activeId ? it.sources : [])
        .filter((s) => companyIdsNow.has(s))
        .map((s) => ({
          id: `e_${s}_${id}`,
          source: s,
          target: id,
          type: "floating",
          animated: true,
        })),
    );
    setNodes((ns) =>
      ns.map((n): Node => ({ ...n, selected: false })).concat(added),
    );
    if (newEdges.length) setEdges((es) => es.concat(newEdges));
  }, [clipboard, nodes, activeId, setNodes, setEdges]);

  const deleteSelection = useCallback(() => {
    const sel = nodes.filter((n) => n.selected);
    if (sel.length === 0) return;
    const ids = new Set(sel.map((n) => n.id));
    setNodes((ns) => ns.filter((n) => !ids.has(n.id)));
    setEdges((es) =>
      es.filter((e) => !ids.has(e.target) && !ids.has(e.source)),
    );
  }, [nodes, setNodes, setEdges]);

  // 마켓 템플릿 가져오기 — 현재 페이지에 기업+지표+연결 추가(복붙처럼, 오프셋·선택표시).
  // 구 템플릿(v2: companyId 단일)도 지원: 단일 기업 인스턴스로 변환해 가져온다.
  const importPage = useCallback(
    (page: PageGraph) => {
      const raw = page as unknown as {
        companies?: { id: string; companyId: string; x: number; y: number }[];
        companyId?: string;
        companyPos?: { x: number; y: number };
        metrics: PageGraph["metrics"];
        formulas?: PageGraph["formulas"];
        displays?: PageGraph["displays"];
        compares?: { id: string; x: number; y: number }[];
        edges: PageGraph["edges"];
      };
      const srcCompanies =
        raw.companies && raw.companies.length > 0
          ? raw.companies
          : typeof raw.companyId === "string"
            ? [
                {
                  id: "company",
                  companyId: raw.companyId,
                  x: raw.companyPos?.x ?? 80,
                  y: raw.companyPos?.y ?? 200,
                },
              ]
            : [];
      if (page.metrics.length === 0 && srcCompanies.length === 0) return;

      const off = GRID * 2;
      const idMap = new Map<string, string>();
      const addedCompanies: Node[] = srcCompanies.map((c) => {
        const id = `c_${idRef.current++}`;
        idMap.set(c.id, id);
        return {
          id,
          type: "company",
          position: { x: c.x + off, y: c.y + off },
          data: { companyId: c.companyId },
          selected: true,
        };
      });
      const addedMetrics: Node[] = page.metrics.map((m) => {
        const id = `m_${idRef.current++}`;
        idMap.set(m.id, id);
        return {
          id,
          type: "metric",
          position: { x: m.x + off, y: m.y + off },
          data: { blockId: m.blockId },
          selected: true,
        };
      });
      const addedFormulas: Node[] = (raw.formulas ?? []).map((f) => {
        const id = `fml_${idRef.current++}`;
        idMap.set(f.id, id);
        return {
          id,
          type: "formula",
          position: { x: f.x + off, y: f.y + off },
          data: { a: f.a, op: f.op, b: f.b, name: f.name },
          selected: true,
        };
      });
      // displays(신) 우선, 없으면 구 compares[](비교만)로 폴백.
      const srcDisplays: DisplayInstance[] =
        raw.displays ??
        (raw.compares ?? []).map((cm) => ({
          id: cm.id,
          kind: "compare" as const,
          x: cm.x,
          y: cm.y,
        }));
      const addedDisplays: Node[] = srcDisplays.map((d) => {
        const id = `${DISPLAY_PREFIX[d.kind]}_${idRef.current++}`;
        idMap.set(d.id, id);
        const node = displayToNode({ ...d, id, x: d.x + off, y: d.y + off });
        return { ...node, selected: true };
      });
      // 구 템플릿 엣지 source "company" 도 idMap 에 잡혀 새 id 로 복원됨.
      const newEdges: Edge[] = page.edges
        .filter((e) => idMap.has(e.source) && idMap.has(e.target))
        .map((e) => {
          const source = idMap.get(e.source)!;
          const target = idMap.get(e.target)!;
          return {
            id: `e_${source}_${target}`,
            source,
            target,
            type: "floating",
            animated: true,
          };
        });
      setNodes((ns) =>
        ns
          .map((n): Node => ({ ...n, selected: false }))
          .concat(addedCompanies, addedMetrics, addedFormulas, addedDisplays),
      );
      if (newEdges.length) setEdges((es) => es.concat(newEdges));
    },
    [setNodes, setEdges],
  );

  // 키보드: Ctrl/Cmd + C/X/V (입력 요소 위에선 무시).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "SELECT" ||
          t.tagName === "TEXTAREA" ||
          t.isContentEditable)
      )
        return;
      if (!(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      if (k === "c") copySelection(false);
      else if (k === "x") {
        e.preventDefault();
        copySelection(true);
      } else if (k === "v") {
        e.preventDefault();
        pasteClipboard();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [copySelection, pasteClipboard]);

  return (
    <div
      className="relative h-[calc(100dvh-7rem)] w-full overflow-hidden"
      onDrop={onDrop}
      onDragOver={onDragOver}
    >
      <LabUiContext.Provider value={labCtx}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          isValidConnection={isValidConnection}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          colorMode={resolvedTheme === "light" ? "light" : "dark"}
          snapToGrid
          snapGrid={[GRID, GRID]}
          selectionOnDrag
          panOnDrag={[1, 2]}
          deleteKeyCode={["Backspace", "Delete"]}
          proOptions={{ hideAttribution: false }}
        >
          <Background gap={GRID} />
          <Controls />
          <MiniMap pannable zoomable className="!bottom-4 !right-4" />
        </ReactFlow>
      </LabUiContext.Provider>

      {/* 좌상단: 햄버거 + 접이식 카테고리 팔레트 */}
      <div className="absolute left-3 top-3 z-10 flex max-h-[calc(100%-1.5rem)] flex-col gap-2">
        <button
          type="button"
          onClick={() => setPaletteOpen((o) => !o)}
          aria-label={paletteOpen ? "팔레트 닫기" : "팔레트 열기"}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card/95 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-surface-2"
        >
          {paletteOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
        {paletteOpen ? (
          <div className="flex max-h-[calc(100dvh-9rem)] w-64 flex-col gap-3 overflow-y-auto rounded-xl border border-border bg-card/95 p-3 shadow-lg backdrop-blur">
            {/* 탭: 페이지 / 블록 (페이지 많아도 팔레트 가려지지 않게 분리) */}
            <div className="flex gap-1 rounded-lg bg-muted/40 p-0.5">
              {(["pages", "blocks"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setPanelTab(t)}
                  className={
                    "flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors " +
                    (panelTab === t
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground")
                  }
                >
                  {t === "pages" ? "페이지" : "블록"}
                </button>
              ))}
            </div>

            {/* 페이지 관리 */}
            {panelTab === "pages" ? (
            <section>
              <ul className="space-y-1">
                {pages.map((p) => {
                  const on = p.id === activeId;
                  const editing = editingId === p.id;
                  return (
                    <li
                      key={p.id}
                      draggable={!editing}
                      onDragStart={(e) =>
                        e.dataTransfer.setData(PAGE_DRAG_KEY, p.id)
                      }
                      onDragOver={(e) => {
                        if (e.dataTransfer.types.includes(PAGE_DRAG_KEY))
                          e.preventDefault();
                      }}
                      onDrop={(e) => {
                        const src = e.dataTransfer.getData(PAGE_DRAG_KEY);
                        if (src) {
                          e.preventDefault();
                          e.stopPropagation();
                          reorderPages(src, p.id);
                        }
                      }}
                      className={
                        "rounded-md " +
                        (on ? "bg-regime-on/15" : "hover:bg-surface-2")
                      }
                    >
                      <div className="flex items-center gap-1.5 px-2 py-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            setColorPickerId(colorPickerId === p.id ? null : p.id)
                          }
                          aria-label="색·아이콘"
                          className="shrink-0"
                        >
                          {p.icon ? (
                            <span className="text-sm leading-none">{p.icon}</span>
                          ) : (
                            <span
                              className={
                                "block h-3 w-3 rounded-full " +
                                (p.color
                                  ? COLOR_DOT[p.color]
                                  : "bg-muted-foreground/40")
                              }
                            />
                          )}
                        </button>
                        {editing ? (
                          <input
                            autoFocus
                            value={draftName}
                            maxLength={24}
                            onChange={(e) => setDraftName(e.target.value)}
                            onBlur={() => renameCommit(p.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") renameCommit(p.id);
                              else if (e.key === "Escape") setEditingId(null);
                            }}
                            className="min-w-0 flex-1 rounded bg-background px-1 text-sm outline-none ring-1 ring-foreground/20"
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => switchPage(p.id)}
                            onDoubleClick={() => {
                              setEditingId(p.id);
                              setDraftName(p.name);
                            }}
                            title="더블클릭하면 이름 변경"
                            className={
                              "min-w-0 flex-1 truncate text-left text-sm " +
                              (on
                                ? "font-medium text-foreground"
                                : "text-muted-foreground")
                            }
                          >
                            {p.name}
                          </button>
                        )}
                        {!editing ? (
                          <button
                            type="button"
                            onClick={() => duplicatePage(p.id)}
                            aria-label="복제"
                            title="복제"
                            className="shrink-0 text-muted-foreground hover:text-foreground"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        ) : null}
                        {pages.length > 1 && !editing ? (
                          <button
                            type="button"
                            onClick={() => deletePage(p.id)}
                            aria-label="삭제"
                            className="shrink-0 text-muted-foreground hover:text-foreground"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        ) : null}
                      </div>
                      {colorPickerId === p.id ? (
                        <div className="flex flex-wrap items-center gap-1.5 border-t border-border px-2 py-2">
                          {PAGE_COLORS.map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setPageColor(p.id, c)}
                              aria-label={c}
                              className={"h-4 w-4 rounded-full " + COLOR_DOT[c]}
                            />
                          ))}
                          {PAGE_EMOJIS.map((em) => (
                            <button
                              key={em}
                              type="button"
                              onClick={() => setPageIcon(p.id, em)}
                              className="text-sm leading-none"
                            >
                              {em}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => {
                              setPageColor(p.id, undefined);
                              setPageIcon(p.id, undefined);
                            }}
                            className="text-[10px] text-muted-foreground hover:text-foreground"
                          >
                            없음
                          </button>
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
              <div className="mt-1.5">
                <button
                  type="button"
                  onClick={() =>
                    canAddPage ? setNewPageMenu((v) => !v) : setShowPaywall(true)
                  }
                  className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border py-1.5 text-xs text-muted-foreground hover:bg-surface-2 hover:text-foreground"
                >
                  {canAddPage ? (
                    <Plus className="h-3.5 w-3.5" />
                  ) : (
                    <Lock className="h-3 w-3" />
                  )}
                  새 페이지
                </button>
                {newPageMenu && canAddPage ? (
                  <div className="mt-1 space-y-0.5 rounded-md border border-border bg-background p-1">
                    <button
                      type="button"
                      onClick={() => {
                        setNewPageMenu(false);
                        addPage();
                      }}
                      className="block w-full rounded px-2 py-1 text-left text-xs hover:bg-surface-2"
                    >
                      빈 페이지
                    </button>
                    {TEMPLATES.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setNewPageMenu(false);
                          addPageFromTemplate(t);
                        }}
                        className="block w-full rounded px-2 py-1 text-left text-xs hover:bg-surface-2"
                      >
                        <span className="font-medium">{t.name}</span>
                        <span className="ml-1 text-muted-foreground">
                          {t.desc}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </section>
            ) : null}

            {/* 블록 팔레트 */}
            {panelTab === "blocks" ? (
            <section>
              <div className="space-y-3">
                <div>
                  <p className="mb-1 text-xs font-medium text-foreground">기업</p>
                  <div
                    draggable
                    onDragStart={(e) =>
                      e.dataTransfer.setData(DRAG_KEY, COMPANY_DRAG)
                    }
                    className="flex cursor-grab items-center gap-2 rounded-lg border-2 border-regime-on/40 bg-background p-2 text-sm transition-colors hover:bg-surface-2 active:cursor-grabbing"
                  >
                    <GripVertical
                      className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                    <span className="flex-1 truncate">기업 블록</span>
                  </div>
                  <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                    여러 개 놓아 한 지표에 연결하면 기업별로 비교돼요.
                  </p>
                </div>
                {CATEGORIES.map((cat) => (
                  <div key={cat}>
                    <p className="mb-1 text-xs font-medium text-foreground">
                      {cat}
                    </p>
                    <div className="space-y-1.5">
                      {blocksByCategory(cat).map((b) => (
                        <div
                          key={b.id}
                          draggable
                          onDragStart={(e) =>
                            e.dataTransfer.setData(DRAG_KEY, b.id)
                          }
                          className="flex cursor-grab items-center gap-2 rounded-lg border border-border bg-background p-2 text-sm transition-colors hover:bg-surface-2 active:cursor-grabbing"
                        >
                          <GripVertical
                            className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                            aria-hidden
                          />
                          <span className="flex-1 truncate">{b.name}</span>
                          {b.pro ? (
                            <span className="rounded bg-muted px-1 py-0.5 text-[10px] text-muted-foreground">
                              Pro
                            </span>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <div>
                  <p className="mb-1 text-xs font-medium text-foreground">표시</p>
                  <div className="space-y-1.5">
                    {(
                      [
                        { kind: "compare" as const, name: "비교 표", pro: false },
                        { kind: "rank" as const, name: "순위", pro: true },
                        { kind: "filter" as const, name: "필터", pro: true },
                      ]
                    ).map((dd) => (
                      <div
                        key={dd.kind}
                        draggable
                        onDragStart={(e) =>
                          e.dataTransfer.setData(DRAG_KEY, DISPLAY_DRAG[dd.kind])
                        }
                        className="flex cursor-grab items-center gap-2 rounded-lg border border-border bg-background p-2 text-sm transition-colors hover:bg-surface-2 active:cursor-grabbing"
                      >
                        <GripVertical
                          className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                          aria-hidden
                        />
                        <span className="flex-1 truncate">{dd.name}</span>
                        {dd.pro ? (
                          <span className="rounded bg-muted px-1 py-0.5 text-[10px] text-muted-foreground">
                            Pro
                          </span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                  <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                    지표의 출력(오른쪽 점)을 연결해 정리·순위·필터링해요.
                  </p>
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium text-foreground">수식</p>
                  <div
                    draggable
                    onDragStart={(e) =>
                      e.dataTransfer.setData(DRAG_KEY, FORMULA_DRAG)
                    }
                    className="flex cursor-grab items-center gap-2 rounded-lg border border-border bg-background p-2 text-sm transition-colors hover:bg-surface-2 active:cursor-grabbing"
                  >
                    <GripVertical
                      className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                    <span className="flex-1 truncate">커스텀 수식</span>
                    <span className="rounded bg-muted px-1 py-0.5 text-[10px] text-muted-foreground">
                      Pro
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                    두 지표를 사칙연산으로 조합해 나만의 지표를 만들어요.
                  </p>
                </div>
              </div>
            </section>
            ) : null}
          </div>
        ) : null}
      </div>


      {/* 우상단: 저장상태 + Pro 미리보기 */}
      <div className="absolute right-3 top-3 z-10 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setMarketOpen(true)}
          className="flex items-center gap-1.5 rounded-lg border border-border bg-card/95 px-2.5 py-1.5 text-xs text-muted-foreground shadow-sm backdrop-blur transition-colors hover:bg-surface-2 hover:text-foreground"
        >
          <Store className="h-3.5 w-3.5" aria-hidden />
          마켓
        </button>
        {saveState !== "idle" ? (
          <span className="rounded-lg border border-border bg-card/95 px-2.5 py-1.5 text-xs text-muted-foreground shadow-sm backdrop-blur">
            {saveState === "saving" ? "저장 중…" : "저장됨"}
          </span>
        ) : null}
        {/* 임시 등급 전환(개발/테스트) — 서버 tier와 무관하게 잠금 동작 확인용 */}
        <div className="flex items-center gap-0.5 rounded-lg border border-border bg-card/95 p-0.5 text-xs shadow-sm backdrop-blur">
          <span
            className="px-1 text-[10px] text-muted-foreground"
            title="개발/테스트용 임시 등급 전환"
          >
            임시
          </span>
          {DEV_TIERS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setDevTier(t)}
              className={
                "rounded-md px-2 py-1 transition-colors " +
                (devTier === t
                  ? "bg-regime-on/15 font-medium text-foreground"
                  : "text-muted-foreground hover:text-foreground")
              }
            >
              {DEV_TIER_LABEL[t]}
            </button>
          ))}
        </div>
      </div>

      {!hasMetric ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-6 z-0 flex justify-center">
          <p className="rounded-full border border-border bg-card/90 px-4 py-2 text-xs text-muted-foreground shadow-sm backdrop-blur">
            왼쪽 팔레트에서 블록을 끌어다 놓고, 기업 블록의 점과 연결해 보세요.
          </p>
        </div>
      ) : null}

      {/* 하단 중앙: 선택/클립보드 액션 바 */}
      {selectedNodeCount > 0 || clipboard.length > 0 ? (
        <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-lg border border-border bg-card/95 p-1 text-xs shadow-sm backdrop-blur">
          <button
            type="button"
            disabled={selectedCount === 0}
            onClick={() => copySelection(false)}
            className="rounded-md px-2 py-1 text-muted-foreground hover:bg-surface-2 hover:text-foreground disabled:opacity-40"
          >
            복사{selectedCount > 0 ? ` (${selectedCount})` : ""}
          </button>
          <button
            type="button"
            disabled={selectedCount === 0}
            onClick={() => copySelection(true)}
            className="rounded-md px-2 py-1 text-muted-foreground hover:bg-surface-2 hover:text-foreground disabled:opacity-40"
          >
            잘라내기
          </button>
          <button
            type="button"
            disabled={clipboard.length === 0}
            onClick={pasteClipboard}
            className="rounded-md px-2 py-1 text-muted-foreground hover:bg-surface-2 hover:text-foreground disabled:opacity-40"
          >
            붙여넣기{clipboard.length > 0 ? ` (${clipboard.length})` : ""}
          </button>
          <button
            type="button"
            disabled={selectedNodeCount === 0}
            onClick={deleteSelection}
            className="rounded-md px-2 py-1 text-muted-foreground hover:bg-surface-2 hover:text-foreground disabled:opacity-40"
          >
            삭제{selectedNodeCount > 0 ? ` (${selectedNodeCount})` : ""}
          </button>
        </div>
      ) : null}

      {/* 삭제 실행취소 토스트 */}
      {deleted ? (
        <div className="absolute bottom-16 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-border bg-card px-4 py-2 text-xs shadow-lg">
          <span className="text-muted-foreground">
            “{deleted.page.name}” 페이지를 삭제했어요
          </span>
          <button
            type="button"
            onClick={undoDelete}
            className="flex items-center gap-1 font-medium text-foreground hover:text-regime-on"
          >
            <RotateCcw className="h-3 w-3" aria-hidden />
            실행취소
          </button>
        </div>
      ) : null}

      {/* 페이지 페이월 */}
      {showPaywall ? (
        <div
          className="absolute inset-0 z-20 flex items-center justify-center bg-background/60 p-4 backdrop-blur-sm"
          onClick={() => setShowPaywall(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-border bg-card p-6 text-center shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="mx-auto mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-regime-on/12 text-regime-on">
              <Lock className="h-5 w-5" aria-hidden />
            </span>
            <h3 className="text-lg font-semibold">페이지 추가는 Pro 기능이에요</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Free는 페이지 {FREE_PAGE_LIMIT}개까지 만들 수 있어요. Pro로
              업그레이드하면 분석 페이지를 자유롭게 늘릴 수 있습니다.
            </p>
            <div className="mt-5 flex flex-col items-center gap-2">
              <UpgradeButton label="Pro 업그레이드" />
              <button
                type="button"
                onClick={() => setShowPaywall(false)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                나중에
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* 잠긴 블록 '펼쳐보기' 업그레이드 모달 — 공유 UpgradeModal(초대 톤·disclaimer 내장) */}
      <UpgradeModal
        open={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        source="lab_block"
      />

      {/* 데이터 출처 표기(DART ToS 준수) + 과신방지 고지 */}
      <p className="pointer-events-none absolute bottom-1 left-3 z-0 text-[10px] leading-tight text-muted-foreground/70">
        데이터: 금융감독원 전자공시(DART) · Yahoo Finance · 정확성 미보장 · 투자권유 아님
      </p>

      <CompanySearch
        open={searchNodeId !== null}
        onClose={() => setSearchNodeId(null)}
        tier={tier}
        onSelect={(entry) => {
          const nodeId = searchNodeId;
          setSearchNodeId(null);
          if (!nodeId) return;
          // 1) 이름 즉시 표시(stub) → 2) 노드에 연결 → 3) 재무 온디맨드 로드 후 갱신.
          ensureCompanyStub(entry);
          setCompaniesVersion((v) => v + 1);
          updateNodeData(nodeId, { companyId: entry.id });
          void getCompanyById(entry.id)
            .then((row) => {
              upsertCompanyFromApi(row);
              setCompaniesVersion((v) => v + 1);
            })
            .catch(() => {
              // 재무 미수집/실패 — stub(이름만) 유지. 노드가 결측을 정직 표기.
            });
        }}
      />

      <MarketDrawer
        open={marketOpen}
        onClose={() => setMarketOpen(false)}
        getCurrentPage={serializeActive}
        onImport={importPage}
      />
    </div>
  );
}

export function BlockCanvas({ tier }: { tier: Tier }) {
  return (
    <ReactFlowProvider>
      <Inner tier={tier} />
    </ReactFlowProvider>
  );
}
