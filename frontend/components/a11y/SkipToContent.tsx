// 본문 바로가기(skip-to-content) — 평소엔 sr-only 로 숨고 Tab 포커스 시 좌상단에 나타난다.
// 키보드/스크린리더 사용자가 반복 내비게이션을 건너뛰고 본문(#main)으로 바로 이동(WCAG 2.4.1).
export function SkipToContent() {
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:border focus:border-border focus:bg-foreground focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-background focus:outline-none focus:ring-2 focus:ring-foreground/30"
    >
      본문으로 건너뛰기
    </a>
  );
}
