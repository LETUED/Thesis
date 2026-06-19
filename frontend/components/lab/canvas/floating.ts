import { Position, type InternalNode } from "@xyflow/react";

// 플로팅 엣지 기하 — 블록을 옮기면 연결선이 '가장 가까운 변'으로 자동 재라우팅된다.
// (React Flow 공식 floating-edge 예제의 교차점 계산을 v12 InternalNode API에 맞춰 정리)

interface Center {
  x: number;
  y: number;
  w: number;
  h: number;
}

function center(node: InternalNode): Center {
  const p = node.internals.positionAbsolute;
  const w = node.measured?.width ?? 0;
  const h = node.measured?.height ?? 0;
  return { x: p.x + w / 2, y: p.y + h / 2, w, h };
}

// intersectionNode 의 테두리에서 targetNode 중심을 향하는 교차점.
function intersection(
  intersectionNode: InternalNode,
  targetNode: InternalNode,
): { x: number; y: number } {
  const i = center(intersectionNode);
  const t = center(targetNode);
  const w = i.w / 2;
  const h = i.h / 2;
  if (w === 0 || h === 0) return { x: i.x, y: i.y };

  const xx1 = (t.x - i.x) / (2 * w) - (t.y - i.y) / (2 * h);
  const yy1 = (t.x - i.x) / (2 * w) + (t.y - i.y) / (2 * h);
  const denom = Math.abs(xx1) + Math.abs(yy1);
  const a = denom === 0 ? 0 : 1 / denom;
  const xx3 = a * xx1;
  const yy3 = a * yy1;
  return { x: w * (xx3 + yy3) + i.x, y: h * (-xx3 + yy3) + i.y };
}

function edgeSide(node: InternalNode, point: { x: number; y: number }): Position {
  const p = node.internals.positionAbsolute;
  const w = node.measured?.width ?? 0;
  const h = node.measured?.height ?? 0;
  const px = Math.round(point.x);
  const py = Math.round(point.y);
  const nx = Math.round(p.x);
  const ny = Math.round(p.y);
  if (px <= nx + 1) return Position.Left;
  if (px >= nx + w - 1) return Position.Right;
  if (py <= ny + 1) return Position.Top;
  return Position.Bottom;
}

export interface EdgeParams {
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  sourcePos: Position;
  targetPos: Position;
}

export function getEdgeParams(
  source: InternalNode,
  target: InternalNode,
): EdgeParams {
  const sp = intersection(source, target);
  const tp = intersection(target, source);
  return {
    sx: sp.x,
    sy: sp.y,
    tx: tp.x,
    ty: tp.y,
    sourcePos: edgeSide(source, sp),
    targetPos: edgeSide(target, tp),
  };
}
