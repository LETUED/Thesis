"use client";

import * as React from "react";
import { Bookmark, Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { saveRule, type SaveRuleInput } from "@/lib/personalization/savedRules";

// 현재 자산배분 설정을 규칙으로 저장. 클릭 → 이름 입력 → saveRule.
// 성공/실패는 인라인 텍스트로만 알린다(컨페티·점수 등 게임화 금지). 차분한 톤 유지.

type Status = "idle" | "naming" | "saving" | "saved" | "error";

export interface SaveRuleButtonProps {
  // 저장할 현재 배분 설정(이름 제외). 호출부가 현재 상태를 평탄화해 넘긴다.
  settings: Omit<SaveRuleInput, "name">;
  // 저장 성공 시 부모가 목록을 갱신하도록 알림(선택).
  onSaved?: () => void;
  defaultName?: string;
  className?: string;
}

export function SaveRuleButton({
  settings,
  onSaved,
  defaultName = "",
  className,
}: SaveRuleButtonProps) {
  const [status, setStatus] = React.useState<Status>("idle");
  const [name, setName] = React.useState(defaultName);
  const inputId = React.useId();
  const feedbackId = React.useId();

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setStatus("saving");
    const ok = await saveRule({ ...settings, name: trimmed });
    if (ok) {
      setStatus("saved");
      setName("");
      onSaved?.();
    } else {
      setStatus("error");
    }
  }

  if (status === "idle" || status === "saved") {
    return (
      <div className={cn("flex flex-col gap-1.5", className)}>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-fit"
          onClick={() => {
            setName(defaultName);
            setStatus("naming");
          }}
        >
          <Bookmark className="mr-1.5 h-4 w-4" aria-hidden />
          이 설정 저장
        </Button>
        {status === "saved" ? (
          <p
            id={feedbackId}
            role="status"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground"
          >
            <Check className="h-3.5 w-3.5" aria-hidden />
            저장했습니다. 저장한 규칙 목록에서 다시 볼 수 있어요.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label htmlFor={inputId} className="text-xs font-medium text-foreground">
        규칙 이름
      </label>
      <div className="flex items-center gap-2">
        <input
          id={inputId}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void handleSave();
            if (e.key === "Escape") setStatus("idle");
          }}
          placeholder="예: 보수적 장기 배분"
          autoFocus
          aria-describedby={status === "error" ? feedbackId : undefined}
          className="h-9 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
        />
        <Button
          type="button"
          size="sm"
          disabled={status === "saving" || !name.trim()}
          onClick={() => void handleSave()}
        >
          {status === "saving" ? "저장 중..." : "저장"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={status === "saving"}
          onClick={() => setStatus("idle")}
        >
          취소
        </Button>
      </div>
      {status === "error" ? (
        <p id={feedbackId} role="alert" className="text-xs text-muted-foreground">
          저장하지 못했습니다. 잠시 후 다시 시도해 주세요.
        </p>
      ) : null}
    </div>
  );
}
