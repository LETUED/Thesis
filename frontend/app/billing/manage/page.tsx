import Link from "next/link";
import { Button } from "@/components/ui/button";

// Stripe 고객 포털에서 돌아오는 return_url. 변경 사항은 webhook 으로 반영된다.
export default function BillingManagePage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 text-center">
      <h1 className="text-2xl font-semibold">구독 정보를 확인했습니다</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        변경하신 내용은 잠시 후 반영됩니다. 대시보드에서 새로고침해 주세요.
      </p>
      <div className="mt-6">
        <Link href="/dashboard">
          <Button type="button">대시보드로 가기</Button>
        </Link>
      </div>
    </div>
  );
}
