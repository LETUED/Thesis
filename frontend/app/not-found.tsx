import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

// 404 — 없는 경로. 차분한 안내 + '돌아갈 길'(대시보드/홈). RootLayout 안에서 렌더되어
// 테마·전역 면책 푸터가 그대로 적용된다. 게스트 첫인상을 지키는 게 목적(Next 기본화면 회피).
export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-5 px-4 text-center">
      <div
        aria-hidden
        className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground"
      >
        <Compass className="h-6 w-6" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          여기엔 페이지가 없어요
        </h1>
        <p className="text-sm text-muted-foreground">
          주소가 바뀌었거나 사라진 페이지일 수 있어요. 아래에서 다시 시작해
          보세요.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Link href="/dashboard">
          <Button>대시보드로</Button>
        </Link>
        <Link href="/">
          <Button variant="outline">홈으로</Button>
        </Link>
      </div>
    </div>
  );
}
