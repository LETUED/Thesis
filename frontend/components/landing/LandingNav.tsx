import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

// 공개 랜딩 헤더. 로그인 사용자는 강제 redirect 대신 '대시보드로' CTA 로 전환.
export function LandingNav({ isAuthed }: { isAuthed: boolean }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-regime-on/15 text-regime-on">
            ◆
          </span>
          THESIS
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {isAuthed ? (
            <Link href="/dashboard">
              <Button size="sm">대시보드로</Button>
            </Link>
          ) : (
            <>
              <Link href="/login" className="hidden sm:block">
                <Button variant="ghost" size="sm">
                  로그인
                </Button>
              </Link>
              <Link href="/signup">
                <Button size="sm">무료로 시작</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
