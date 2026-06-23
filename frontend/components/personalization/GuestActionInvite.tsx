import Link from "next/link";
import { LogIn } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { safeInternalPath } from "@/lib/auth/guards";

// 게스트가 저장/관심 등 계정이 필요한 행동을 시도할 때, 조용한 실패(또는 오해 소지 에러)
// 대신 '저장 가치'를 제시하며 로그인으로 부드럽게 안내한다. ScreenerBoard 의 GuestWatchLink 와
// 동일한 전환 패턴(가치 제시 + redirectedFrom 복귀)을 텍스트+버튼 맥락에 일반화한 공용 컴포넌트.
// 설계철학: 강요·"지금 사세요" 금지 — 정보/편의 접근으로 표현. redirectedFrom 은 오픈
// 리다이렉트 방지를 위해 safeInternalPath 로 정규화한다.
export interface GuestActionInviteProps {
  // 왜 로그인하면 좋은지 한 줄(저장 가치). 예: "로그인하면 이 설정을 저장해 다시 볼 수 있어요."
  message: string;
  // 로그인 후 돌아올 내부 경로.
  redirectedFrom: string;
  className?: string;
}

export function GuestActionInvite({
  message,
  redirectedFrom,
  className,
}: GuestActionInviteProps) {
  const target = `/login?redirectedFrom=${encodeURIComponent(
    safeInternalPath(redirectedFrom),
  )}`;

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-md border border-border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <p className="text-sm text-muted-foreground">{message}</p>
      <Link href={target} className="shrink-0">
        <Button variant="outline" size="sm" className="gap-1.5">
          <LogIn className="h-4 w-4" aria-hidden />
          로그인
        </Button>
      </Link>
    </div>
  );
}
