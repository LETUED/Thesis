import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRegime } from "@/lib/api";
import { AppShell } from "@/components/app-shell/AppShell";
import { Panel } from "@/components/ui/panel";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { LogoutButton } from "@/components/LogoutButton";
import { UpgradeButton } from "@/components/billing/UpgradeButton";
import { ManageSubscriptionButton } from "@/components/billing/ManageSubscriptionButton";
import { PlanComparison } from "@/components/billing/PlanComparison";
import { SavedRulesSection } from "@/components/settings/SavedRulesSection";
import { AlertRulesSection } from "@/components/settings/AlertRulesSection";
import type { Tier } from "@/lib/types";

export default async function SettingsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirectedFrom=/settings");

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;

  let tier: Tier = "free";
  try {
    const r = await getRegime("free", token);
    tier = r.tier;
  } catch {
    // 티어 조회 실패 시 보수적으로 free 유지.
  }

  return (
    <AppShell tier={tier}>
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">설정</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            계정과 구독, 저장한 설정·알림, 화면 표시를 관리합니다.
          </p>
        </header>

        {/* ① 계정 */}
        <Panel as="section">
          <h2 className="text-lg font-medium">계정</h2>
          <dl className="mt-4">
            <dt className="text-xs font-medium text-muted-foreground">
              이메일
            </dt>
            <dd className="mt-1 text-sm text-foreground">
              {user.email ?? "이메일 정보 없음"}
            </dd>
          </dl>
        </Panel>

        {/* ② 구독 */}
        <Panel as="section">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-medium">구독</h2>
            <span className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground">
              {tier === "pro" ? "Pro" : "Free"}
            </span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {tier === "pro"
              ? "Pro 플랜을 이용 중입니다. 결제 수단 변경이나 해지는 구독 관리에서 진행할 수 있습니다."
              : "현재 무료 플랜입니다. Pro로 전환하면 지표 상세와 기업분석 전체를 살펴볼 수 있습니다."}
          </p>
          <div className="mt-4">
            {tier === "pro" ? (
              <ManageSubscriptionButton />
            ) : (
              <UpgradeButton label="Pro 업그레이드" />
            )}
          </div>
        </Panel>

        {/* ③ 저장한 자산배분 설정 */}
        <Panel as="section">
          <h2 className="text-lg font-medium">저장한 자산배분 설정</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            이름 붙여 저장해 둔 배분 설정입니다. 다시 불러와 참고용으로 살펴볼 수
            있어요 — 매수·매도 판단을 대신하지는 않습니다.
          </p>
          <div className="mt-4">
            <SavedRulesSection />
          </div>
        </Panel>

        {/* ④ 알림 */}
        <Panel as="section">
          <h2 className="text-lg font-medium">알림</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            설정한 임계 알림을 관리합니다. 알림 추가는 관심 지표 카드에서 할 수
            있어요. 임계값이 경계 구간에 들어선 순간만 알려줄 뿐, 매수·매도
            시점을 알리지는 않습니다.
          </p>
          <div className="mt-4">
            <AlertRulesSection />
          </div>
        </Panel>

        {/* ⑤ 플랜 */}
        <Panel as="section">
          <h2 className="text-lg font-medium">플랜</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            현재{" "}
            <span className="font-medium text-foreground">
              {tier === "pro" ? "Pro" : "Free"}
            </span>{" "}
            플랜을 이용 중입니다. 플랜별로 무엇을 더 살펴볼 수 있는지 비교해
            보세요.
          </p>
          <div className="mt-5">
            <PlanComparison compact />
          </div>
        </Panel>

        {/* ⑥ 표시 */}
        <Panel as="section">
          <h2 className="text-lg font-medium">표시</h2>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-foreground">테마</p>
              <p className="mt-1 text-sm text-muted-foreground">
                다크/라이트 모드를 전환합니다.
              </p>
            </div>
            <ThemeToggle />
          </div>
        </Panel>

        {/* ⑦ 로그아웃 */}
        <Panel as="section">
          <h2 className="text-lg font-medium">로그아웃</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            이 기기에서 세션을 종료합니다.
          </p>
          <div className="mt-4">
            <LogoutButton />
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
