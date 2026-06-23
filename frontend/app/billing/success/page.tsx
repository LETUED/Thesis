import Link from "next/link";
import { Button } from "@/components/ui/button";

// 결제 완료 직후 도착. tier 승급은 webhook 으로 반영되며 수 초 걸릴 수 있다.
export default function BillingSuccessPage() {
  return (
    <main
      id="main"
      tabIndex={-1}
      className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 text-center outline-none"
    >
      <h1 className="text-2xl font-semibold">구독이 시작되었습니다</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Pro 근거가 곧 열립니다. 반영까지 잠시(수 초) 걸릴 수 있으니, 대시보드에서
        새로고침해 주세요.
      </p>
      <div className="mt-6">
        <Link href="/dashboard">
          <Button type="button">대시보드로 가기</Button>
        </Link>
      </div>
    </main>
  );
}
