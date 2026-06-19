import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRegime } from "@/lib/api";
import { AppShell } from "@/components/app-shell/AppShell";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { LogoutButton } from "@/components/LogoutButton";
import { UpgradeButton } from "@/components/billing/UpgradeButton";
import { ManageSubscriptionButton } from "@/components/billing/ManageSubscriptionButton";
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
            계정과 구독, 화면 표시를 관리합니다.
          </p>
        </header>

        {/* ① 계정 */}
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-lg font-medium">계정</h2>
          <dl className="mt-4">
            <dt className="text-xs font-medium text-muted-foreground">
              이메일
            </dt>
            <dd className="mt-1 text-sm text-foreground">
              {user.email ?? "이메일 정보 없음"}
            </dd>
          </dl>
        </section>

        {/* ② 구독 */}
        <section className="rounded-xl border border-border bg-card p-5">
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
        </section>

        {/* ③ 표시 */}
        <section className="rounded-xl border border-border bg-card p-5">
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
        </section>

        {/* ④ 로그아웃 */}
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-lg font-medium">로그아웃</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            이 기기에서 세션을 종료합니다.
          </p>
          <div className="mt-4">
            <LogoutButton />
          </div>
        </section>
      </div>
    </AppShell>
  );
}
