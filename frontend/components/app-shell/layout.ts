// AppShell(실제 셸)과 AppShellSkeleton(로딩 셸)이 공유하는 레이아웃 클래스 단일 출처.
// 한쪽만 바뀌어 사이드바 폭·main 정렬이 어긋나면 로딩→실제 전환 시 레이아웃 점프가
// 재발하므로, 치수에 직결되는 클래스는 여기 한 곳에서 관리한다.
export const SHELL_SIDEBAR =
  "hidden w-56 shrink-0 flex-col border-r border-border bg-card/40 md:flex";
export const SHELL_HEADER =
  "flex items-center gap-3 border-b border-border px-4 py-3 md:px-8";
export const SHELL_MAIN =
  "mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-8 md:py-8";
