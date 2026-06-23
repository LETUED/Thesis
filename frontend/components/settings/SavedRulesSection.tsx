"use client";

import * as React from "react";
import Link from "next/link";
import { Bookmark } from "lucide-react";
import {
  deleteRule,
  listSavedRules,
} from "@/lib/personalization/savedRules";
import type { SavedRule } from "@/lib/personalization/companyId";
import { SavedRuleCard } from "@/components/personalization/SavedRuleCard";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

// 설정 페이지 "저장한 자산배분 설정" island.
// listSavedRules 로 목록을 패치(fail-open)하고 SavedRuleCard 로 표시·삭제(deleteRule).
// 비면 교육형 EmptyState 로 /allocation 으로 안내한다(저장은 거기서). 적용 동선은 보수적으로 생략.
// 테이블 미적용/미인증이면 목록은 비고 UI 는 안 깨진다.

export function SavedRulesSection() {
  const [rules, setRules] = React.useState<SavedRule[]>([]);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    void listSavedRules().then((next) => {
      if (!active) return;
      setRules(next);
      setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, []);

  async function handleDelete(id: string) {
    const ok = await deleteRule(id);
    if (ok) setRules((prev) => prev.filter((r) => r.id !== id));
  }

  if (rules.length > 0) {
    return (
      <ul className="grid gap-3 sm:grid-cols-2">
        {rules.map((rule) => (
          <li key={rule.id}>
            <SavedRuleCard rule={rule} onDelete={handleDelete} />
          </li>
        ))}
      </ul>
    );
  }

  if (!loaded) {
    return (
      <p className="text-sm text-muted-foreground">
        저장한 설정을 불러오는 중...
      </p>
    );
  }

  return (
    <EmptyState
      variant="teaching"
      icon={<Bookmark className="h-5 w-5" aria-hidden />}
      title="아직 저장한 설정이 없어요"
      description="자산배분에서 투자 기간과 성향을 고른 뒤 '이 설정 저장'을 누르면, 같은 기준을 여기에 모아 다시 불러올 수 있습니다. 매수·매도 판단을 대신하지는 않습니다."
      action={
        <Link href="/allocation">
          <Button variant="outline">자산배분에서 설정 저장하기</Button>
        </Link>
      }
    />
  );
}
