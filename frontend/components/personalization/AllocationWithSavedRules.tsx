"use client";

import * as React from "react";
import Link from "next/link";
import { Bookmark } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import {
  AllocationPanel,
  type AllocationSettings,
} from "@/components/AllocationPanel";
import { SaveRuleButton } from "@/components/personalization/SaveRuleButton";
import { SavedRuleCard } from "@/components/personalization/SavedRuleCard";
import { EmptyState } from "@/components/ui/empty-state";
import {
  deleteRule,
  listSavedRules,
} from "@/lib/personalization/savedRules";
import type { SavedRule } from "@/lib/personalization/companyId";
import { track } from "@/lib/analytics";
import type { Tier } from "@/lib/types";

// /allocation 저장규칙 배선 island.
// AllocationPanel 의 현재 설정을 mirror → SaveRuleButton 으로 저장,
// 저장된 규칙은 "저장한 설정" 목록(SavedRuleCard)으로 표시·삭제(보수적: 적용 동선 없음).
// fail-open — 테이블 미적용/미인증이면 목록은 비고 UI 는 안 깨진다.

export function AllocationWithSavedRules({
  tier,
  isAuthed,
}: {
  tier: Tier;
  isAuthed: boolean;
}) {
  const [settings, setSettings] = React.useState<AllocationSettings | null>(
    null,
  );
  const [rules, setRules] = React.useState<SavedRule[]>([]);
  const [loaded, setLoaded] = React.useState(false);

  const handleSettingsChange = React.useCallback(
    (next: AllocationSettings) => setSettings(next),
    [],
  );

  const refresh = React.useCallback(async () => {
    const next = await listSavedRules();
    setRules(next);
    setLoaded(true);
  }, []);

  React.useEffect(() => {
    // 익명은 저장 조회를 하지 않는다(미인증 saveRule/listSavedRules 는 항상 빈 결과 → 거짓 '저장 실패' 차단).
    if (!isAuthed) return;
    void refresh();
  }, [refresh, isAuthed]);

  async function handleDelete(id: string) {
    const ok = await deleteRule(id);
    if (ok) setRules((prev) => prev.filter((r) => r.id !== id));
  }

  function handleSaved() {
    track("allocation_rule_save", { tier });
    void refresh();
  }

  return (
    <div className="space-y-6">
      <AllocationPanel tier={tier} onSettingsChange={handleSettingsChange} />

      {isAuthed ? (
        <>
          {settings ? (
            <div className="rounded-md border border-border bg-muted/20 p-4">
              <p className="mb-2 text-sm font-medium text-foreground">
                지금 설정을 저장해 둘까요?
              </p>
              <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
                성향·투자 기간·국면 반영 여부를 이름 붙여 저장하면, 다음에 같은
                기준으로 다시 살펴볼 수 있어요. 매수·매도 판단을 대신하지는
                않습니다.
              </p>
              <SaveRuleButton settings={settings} onSaved={handleSaved} />
            </div>
          ) : null}

          <section aria-labelledby="saved-rules-heading" className="space-y-3">
            <h2
              id="saved-rules-heading"
              className="text-sm font-semibold text-foreground"
            >
              저장한 설정
            </h2>

            {rules.length > 0 ? (
              <ul className="grid gap-3 sm:grid-cols-2">
                {rules.map((rule) => (
                  <li key={rule.id}>
                    <SavedRuleCard rule={rule} onDelete={handleDelete} />
                  </li>
                ))}
              </ul>
            ) : loaded ? (
              <EmptyState
                variant="teaching"
                icon={<Bookmark className="h-5 w-5" aria-hidden />}
                title="아직 저장한 설정이 없어요"
                description="투자 기간과 성향을 고른 뒤 위에서 '이 설정 저장'을 누르면, 같은 기준을 여기에 모아 다시 불러올 수 있습니다."
              />
            ) : (
              <p className={cn("text-sm text-muted-foreground")}>
                저장한 설정을 불러오는 중...
              </p>
            )}
          </section>
        </>
      ) : (
        // 익명: 저장은 가입 후 — '저장 실패' 거짓 신호 대신 정직한 안내로 가입을 유도(강요 톤 금지).
        <div className="rounded-md border border-border bg-muted/20 p-4">
          <div className="flex items-start gap-2.5">
            <Bookmark
              className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
              aria-hidden
            />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                이 설정을 저장해 두고 싶다면
              </p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                회원가입하면 성향·투자 기간을 이름 붙여 저장하고, 다음에 같은
                기준으로 다시 살펴볼 수 있어요. 결론을 보는 데는 가입이 필요
                없습니다.
              </p>
            </div>
          </div>
          <div className="mt-3">
            <Link href="/signup">
              <Button size="sm" variant="outline">
                무료로 시작하고 설정 저장
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
