import { createClient } from "@/lib/supabase/server";
import { getRegime } from "@/lib/api";
import { AppShell } from "@/components/app-shell/AppShell";
import { AllocationWithSavedRules } from "@/components/personalization/AllocationWithSavedRules";
import { PageConclusion } from "@/components/glance/PageConclusion";
import { NextStep } from "@/components/glance/NextStep";
import type { Tier } from "@/lib/types";

// 게스트 열람 공개 + 사용자별(쿠키 기반) 응답이라 항상 동적 렌더.
export const dynamic = "force-dynamic";

export default async function AllocationPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAuthed = !!user;

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;

  let tier: Tier = "free";
  try {
    const regime = await getRegime("free", token);
    tier = regime.tier;
  } catch {
    tier = "free";
  }

  return (
    <AppShell tier={tier} isAuthed={isAuthed}>
      <div className="space-y-6">
        <PageConclusion
          title="③ 자산배분 · 비중"
          headline="투자 기간과 성향을 고르면, 현재 국면을 반영한 비율의 근거를 살펴봅니다."
        />

        <header>
          <p className="text-sm text-muted-foreground">
            현금은 최소 20%, 단일 종목은 최대 15%로 제한해 한쪽에 치우치지 않게
            잡습니다.
          </p>
        </header>

        <div className="mx-auto w-full max-w-2xl">
          <AllocationWithSavedRules tier={tier} />
        </div>

        <NextStep
          prevHref="/indicators"
          prevLabel="지표 상세"
          nextHref="/dashboard"
          nextLabel="대시보드로 돌아가기"
          reason="비율의 근거를 확인했다면, 대시보드에서 전체 흐름을 한눈에 다시 점검합니다."
        />
      </div>
    </AppShell>
  );
}
