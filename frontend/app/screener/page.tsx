import Link from "next/link";
import { ArrowRight, Building2, PieChart } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getRegime, getCompanies } from "@/lib/api";
import { AppShell } from "@/components/app-shell/AppShell";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { CompanyLookup } from "@/components/company/CompanyLookup";
import { ScreenerBoard } from "@/components/screener/ScreenerBoard";
import { COMPANIES, companiesFromApi, type Company } from "@/lib/lab/data";
import { buildScreenerRows } from "@/lib/screener/screen";
import type { Tier } from "@/lib/types";

// 게스트 열람 공개 + 사용자별(쿠키 기반) 응답이라 항상 동적 렌더.
export const dynamic = "force-dynamic";

export default async function ScreenerPage() {
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
    // 국면 데이터를 못 받아도 페이지는 동작한다 — 기본 free 유지.
  }

  // 스크리너 유니버스 — 백엔드 실데이터, 실패 시 mock 유니버스로 폴백(페이지 동작 유지).
  let companies: Company[] = COMPANIES;
  try {
    const rows = await getCompanies();
    if (rows.length) companies = companiesFromApi(rows);
  } catch {
    // 백엔드 미연결 — mock 폴백 유지.
  }

  // 안전 DTO 로 변환 — Free 는 raw 수치를 담지 않는다(RSC payload 누출 방지).
  // 정확한 수치(displays)는 Pro 행에만 실린다.
  const screenerRows = buildScreenerRows(companies, tier === "pro");

  return (
    <AppShell tier={tier} isAuthed={isAuthed}>
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">기업분석</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            매크로 국면 위에서 기업을 골라 재무 신호를 살펴보는 화면입니다.
            결론과 등급은 무료, 정확한 수치는 Pro에서 펼쳐 볼 수 있어요.
          </p>
        </header>

        {/* 스크리너 — 유니버스를 재무 기준으로 필터·정렬(등급 Free / 수치 Pro). */}
        <ScreenerBoard rows={screenerRows} tier={tier} isAuthed={isAuthed} />

        {/* 검색 island — 기업 선택 시 평결 카드를 렌더. 미선택 시 아래 교육형 zero 상태 유지. */}
        <CompanyLookup
          tier={tier}
          zeroState={
            <EmptyState
              variant="teaching"
              icon={<Building2 className="h-5 w-5" aria-hidden />}
              title="국면 → 배분을 먼저 보고 종목을 좁히세요"
              description="위에서 아래로 — 매크로 국면과 자산배분을 먼저 확인하면 어떤 섹터·종목을 살펴볼지 자연스럽게 좁혀져요. 위 검색에서 기업을 고르면 재무 평결이 나타납니다."
              action={
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Link href="/dashboard">
                    <Button variant="outline" className="gap-2">
                      <ArrowRight className="h-4 w-4" aria-hidden />
                      국면 보기
                    </Button>
                  </Link>
                  <Link href="/allocation">
                    <Button variant="outline" className="gap-2">
                      <PieChart className="h-4 w-4" aria-hidden />
                      자산배분 보기
                    </Button>
                  </Link>
                </div>
              }
            />
          }
        />
      </div>
    </AppShell>
  );
}
