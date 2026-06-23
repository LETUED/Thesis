// 라우트 보호/리다이렉트 정책 — 순수 함수(프레임워크 비의존, 단위 테스트 대상).
// 게스트(무가입) 열람 모드: 핵심 결론 페이지는 공개, 계정·개인화 페이지만 보호한다.

// 로그인이 필요한 경로 prefix. 게스트 열람 대상(dashboard/indicators/allocation/screener/lab)은
// 여기 없다 — 익명 free 로 결론을 보여주고, 가입은 개인화/Pro 에서만 유도한다.
export const PROTECTED_PREFIXES = ["/settings", "/portfolio"] as const;

// 경로가 보호 대상인지. 정확히 일치하거나 그 하위 경로(prefix + "/")만 매칭한다.
// startsWith 단독은 "/settings-export" 같은 유사 경로를 오매칭하므로 경계를 둔다.
export function isProtectedPath(path: string): boolean {
  return PROTECTED_PREFIXES.some((p) => path === p || path.startsWith(p + "/"));
}

// 로그인 후 돌아갈 redirectedFrom 검증 — 오픈 리다이렉트 방지.
// 같은 오리진 내부 절대경로("/...")만 허용하고, 프로토콜-상대("//")·백슬래시("/\\")·
// 외부 URL·상대경로·빈값은 안전한 기본값으로 떨군다.
export function safeInternalPath(
  path: string | null | undefined,
  fallback = "/dashboard",
): string {
  if (typeof path !== "string" || path.length === 0) return fallback;
  if (path[0] !== "/") return fallback;
  if (path[1] === "/" || path[1] === "\\") return fallback;
  return path;
}
