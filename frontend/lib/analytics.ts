// 이벤트 추적 — no-op-safe. SSR(window/fetch 미존재)에서도 안전, 실패 무시(fire-and-forget).
// 백엔드 /api/events 로 비동기 전송하되, 응답을 기다리거나 에러로 흐름을 막지 않는다.

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export function track(
  event: string,
  payload?: Record<string, unknown>,
): void {
  if (typeof window === "undefined" || typeof fetch === "undefined") return;

  void fetch(`${API_BASE_URL}/api/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, payload: payload ?? {} }),
    keepalive: true,
  }).catch(() => {});
}
