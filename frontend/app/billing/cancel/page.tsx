import Link from "next/link";
import { Button } from "@/components/ui/button";

// 결제를 중단하고 돌아온 경우. 압박 없는 중립 톤.
export default function BillingCancelPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 text-center">
      <h1 className="text-2xl font-semibold">결제를 진행하지 않았습니다</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        언제든 다시 시작하실 수 있습니다. Free에서도 국면 신호와 기본 자산배분은
        계속 보실 수 있습니다.
      </p>
      <div className="mt-6">
        <Link href="/dashboard">
          <Button type="button" variant="outline">
            대시보드로 돌아가기
          </Button>
        </Link>
      </div>
    </div>
  );
}
