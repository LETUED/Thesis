"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

// 라우트 에러 경계(Next.js App Router). 렌더/데이터 예외 시 Next 기본화면 대신
// 차분한 안내 + 복구 경로(다시 시도/대시보드). 단정·공포 톤 금지(설계철학).
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // 운영 모니터링용 로그(추후 Sentry 연동 시 이 지점에서 캡처).
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-5 px-4 text-center">
      <div
        aria-hidden
        className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground"
      >
        <AlertTriangle className="h-6 w-6" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          잠시 문제가 생겼어요
        </h1>
        <p className="text-sm text-muted-foreground">
          일시적인 오류일 수 있어요. 다시 시도하거나 대시보드로 돌아가 주세요.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button onClick={reset}>다시 시도</Button>
        <Link href="/dashboard">
          <Button variant="outline">대시보드로</Button>
        </Link>
      </div>
    </div>
  );
}
