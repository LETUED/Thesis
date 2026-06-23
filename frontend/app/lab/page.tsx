import { createClient } from "@/lib/supabase/server";
import { getRegime } from "@/lib/api";
import { AppShell } from "@/components/app-shell/AppShell";
import { BlockCanvas } from "@/components/lab/canvas/BlockCanvas";
import type { Tier } from "@/lib/types";

// 게스트 열람 공개 + 사용자별(쿠키 기반) 응답이라 항상 동적 렌더.
export const dynamic = "force-dynamic";

export default async function LabPage() {
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
    const r = await getRegime("free", token);
    tier = r.tier;
  } catch {
    tier = "free";
  }

  // 캔버스는 최대한 넓게 — 페이지 헤더 없이 풀블리드. 제목·도구는 캔버스 위 플로팅.
  return (
    <AppShell tier={tier} isAuthed={isAuthed} fullBleed>
      <BlockCanvas tier={tier} />
    </AppShell>
  );
}
