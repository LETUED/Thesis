import {
  getSmoothStepPath,
  useInternalNode,
  BaseEdge,
  type EdgeProps,
} from "@xyflow/react";
import { getEdgeParams } from "@/components/lab/canvas/floating";

// 플로팅 + smoothstep 엣지: 두 노드의 가장 가까운 변끼리 직각으로 꺾어 연결.
// 노드를 옮기면 가까운 변으로 자동 재라우팅되어 선이 꼬이지 않는다.
export function FloatingEdge({ id, source, target, markerEnd, style }: EdgeProps) {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);
  if (!sourceNode || !targetNode) return null;

  const { sx, sy, tx, ty, sourcePos, targetPos } = getEdgeParams(
    sourceNode,
    targetNode,
  );

  const [path] = getSmoothStepPath({
    sourceX: sx,
    sourceY: sy,
    targetX: tx,
    targetY: ty,
    sourcePosition: sourcePos,
    targetPosition: targetPos,
    borderRadius: 12,
  });

  return <BaseEdge id={id} path={path} markerEnd={markerEnd} style={style} />;
}
