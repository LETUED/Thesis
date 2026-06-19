// 블록 포트(소켓) 타입 시스템 — docs/06 §3.
// React Flow엔 maxConnections/타입검증이 없으므로 handle id에 타입을 인코딩하고
// isValidConnection으로 "되는 연결만" 강제한다. 지금은 Company만 쓰지만
// 이후 Number/NumberList(비교·집계·디스플레이)로 확장 가능하게 최소 인프라만 둔다.

export type PortType = "Company" | "Number" | "NumberList";

// 포트 색(중립/신호색과 구분). 같은 색끼리 연결 가능 = 시각 신호.
export const PORT_COLOR: Record<PortType, string> = {
  Company: "!bg-sky-500",
  Number: "!bg-amber-500",
  NumberList: "!bg-violet-500",
};

type Dir = "out" | "in";

// handle id 규약: `${dir}:${type}:${side}`  예) "out:Company:r", "in:Company:l"
export function handleId(dir: Dir, type: PortType, side: string): string {
  return `${dir}:${type}:${side}`;
}

export function parseHandle(
  id: string | null | undefined,
): { dir: Dir; type: PortType; side: string } | null {
  if (!id) return null;
  const parts = id.split(":");
  if (parts.length !== 3) return null;
  const [dir, type, side] = parts as [string, string, string];
  if (dir !== "out" && dir !== "in") return null;
  if (type !== "Company" && type !== "Number" && type !== "NumberList")
    return null;
  return { dir, type, side };
}

// 출력 포트 타입 → 입력 포트 타입 호환 여부. 지금은 동일 타입만.
export function isCompatible(out: PortType, inn: PortType): boolean {
  return out === inn;
}
