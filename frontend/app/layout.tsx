import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { MotionProvider } from "@/components/motion/MotionProvider";
import { SkipToContent } from "@/components/a11y/SkipToContent";

export const metadata: Metadata = {
  title: "THESIS — 투자 판단의 근거",
  description:
    "매크로부터 기업분석까지, 결론과 그 근거를 함께 봅니다. 매수·매도 권유가 아닙니다.",
};

const GLOBAL_DISCLAIMER =
  "본 서비스는 시장 데이터와 지표를 바탕으로 한 정보 제공용이며, 특정 종목·자산의 매수 또는 매도를 권유하지 않습니다. 모든 투자 판단과 책임은 이용자 본인에게 있습니다.";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // suppressHydrationWarning: next-themes 가 <html>에 class 를 주입하므로 필요.
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="min-h-screen flex flex-col antialiased">
        <SkipToContent />
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <MotionProvider>
            {/* 페이지당 단일 main 랜드마크 — AppShell/AppShellSkeleton 은 더는 main 을 렌더하지 않는다.
                트레이드오프(후속): AppShell 페이지에선 이 main 이 사이드바/헤더까지 감싸므로
                skip-link 가 사이드바를 완전히 건너뛰진 못한다. 사이드바를 main 밖으로 빼는
                완전 배치는 비-AppShell 페이지 main 추가가 필요해 다음 사이클로 분리. */}
            <main id="main" tabIndex={-1} className="flex-1 outline-none">
              {children}
            </main>
            <footer className="border-t bg-muted/40">
            <div className="mx-auto max-w-5xl px-4 py-4 text-xs leading-relaxed text-muted-foreground">
              {GLOBAL_DISCLAIMER}
            </div>
          </footer>
          </MotionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
