import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { MotionProvider } from "@/components/motion/MotionProvider";

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
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <MotionProvider>
            <main className="flex-1">{children}</main>
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
