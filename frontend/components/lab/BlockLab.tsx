"use client";

import { useMemo, useState } from "react";
import { m } from "motion/react";
import { Lock, Check, Plus, ArrowRight, FlaskConical } from "lucide-react";
import {
  COMPANIES,
  BLOCKS,
  TEMPLATES,
  type Company,
  type Tone,
} from "@/lib/lab/data";

const TONE: Record<Tone, { dot: string; label: string }> = {
  good: { dot: "bg-regime-on", label: "양호" },
  neutral: { dot: "bg-regime-neutral", label: "보통" },
  watch: { dot: "bg-regime-off", label: "주의" },
};

export function BlockLab() {
  const [companyId, setCompanyId] = useState<string>(COMPANIES[0]?.id ?? "");
  const [active, setActive] = useState<string[]>(TEMPLATES[0]?.blockIds ?? []);
  const [proUnlocked, setProUnlocked] = useState(false);

  const company: Company = useMemo(
    () => COMPANIES.find((c) => c.id === companyId) ?? COMPANIES[0]!,
    [companyId],
  );

  function toggle(id: string, pro: boolean | undefined) {
    if (pro && !proUnlocked) return; // 잠금 데모
    setActive((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  // 결과는 BLOCKS 정의 순서로(활성화된 것만).
  const activeBlocks = BLOCKS.filter((b) => active.includes(b.id));

  return (
    <div className="space-y-6">
      {/* 안내 */}
      <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
        <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-regime-on/12 text-regime-on">
          <FlaskConical className="h-4 w-4" aria-hidden />
        </span>
        <p className="text-sm leading-relaxed text-muted-foreground">
          ① <span className="text-foreground">템플릿</span>을 고르거나 ②{" "}
          <span className="text-foreground">블록</span>을 직접 켜고 ③{" "}
          <span className="text-foreground">기업</span>을 고르면 — 오른쪽에 결과가
          바로 나와요. (프로토타입 · 목업 데이터)
        </p>
      </div>

      {/* 템플릿 */}
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          템플릿으로 시작
        </p>
        <div className="flex flex-wrap gap-2">
          {TEMPLATES.map((t) => {
            const on = t.blockIds.every((b) => active.includes(b)) &&
              active.length === t.blockIds.length;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActive(t.blockIds)}
                className={
                  "rounded-lg border px-3 py-2 text-left transition-colors " +
                  (on
                    ? "border-regime-on/50 bg-regime-on/12"
                    : "border-border bg-card hover:bg-surface-2")
                }
              >
                <span className="block text-sm font-medium">{t.name}</span>
                <span className="block text-xs text-muted-foreground">
                  {t.desc}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 기업 탭 */}
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          기업 고르기
        </p>
        <div className="flex flex-wrap gap-2">
          {COMPANIES.map((c) => {
            const on = c.id === companyId;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setCompanyId(c.id)}
                className={
                  "rounded-lg border px-3 py-1.5 text-sm transition-colors " +
                  (on
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-card text-muted-foreground hover:bg-surface-2")
                }
              >
                {c.name}
                <span className="ml-1.5 text-xs opacity-60">{c.ticker}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 조립 → 결과 */}
      <div className="grid gap-6 lg:grid-cols-[1fr_auto_1.1fr] lg:items-start">
        {/* 블록 고르기 */}
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="mb-3 text-sm font-medium">블록 고르기</p>
          <div className="space-y-2">
            {BLOCKS.map((b) => {
              const on = active.includes(b.id);
              const locked = b.pro && !proUnlocked;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => toggle(b.id, b.pro)}
                  disabled={locked}
                  className={
                    "flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors " +
                    (locked
                      ? "cursor-not-allowed border-dashed border-border bg-muted/30 opacity-70"
                      : on
                        ? "border-regime-on/50 bg-regime-on/12"
                        : "border-border bg-background hover:bg-surface-2")
                  }
                >
                  <span
                    className={
                      "mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded " +
                      (on ? "bg-regime-on text-on-emphasis" : "bg-muted text-muted-foreground")
                    }
                    aria-hidden
                  >
                    {locked ? (
                      <Lock className="h-3 w-3" />
                    ) : on ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Plus className="h-3 w-3" />
                    )}
                  </span>
                  <span className="flex-1">
                    <span className="flex items-center gap-1.5 text-sm font-medium">
                      {b.name}
                      {b.pro ? (
                        <span className="rounded bg-muted px-1 py-0.5 text-[10px] text-muted-foreground">
                          Pro
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                      {b.explanation}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <label className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={proUnlocked}
              onChange={(e) => setProUnlocked(e.target.checked)}
              className="accent-regime-on"
            />
            Pro 블록 미리보기(데모) — 결제 시 차차 열리는 기능
          </label>
        </div>

        {/* 연결 화살표 */}
        <div className="hidden items-center justify-center self-center lg:flex">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground">
            <ArrowRight className="h-5 w-5" aria-hidden />
          </span>
        </div>

        {/* 결과 */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium">결과 — {company.name}</p>
            <span className="text-xs text-muted-foreground">근거 {activeBlocks.length}개</span>
          </div>

          {activeBlocks.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              왼쪽에서 블록을 켜 보세요.
            </p>
          ) : (
            <div className="space-y-2.5">
              {activeBlocks.map((b, i) => {
                const locked = b.pro && !proUnlocked;
                const r = b.compute(company);
                return (
                  <m.div
                    key={`${b.id}-${company.id}-${String(locked)}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, ease: "easeOut", delay: i * 0.03 }}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background p-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{b.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {locked ? "Pro에서 근거를 확인할 수 있어요." : r.note}
                      </p>
                    </div>
                    {locked ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                        <Lock className="h-3 w-3" aria-hidden /> Pro
                      </span>
                    ) : (
                      <span className="flex shrink-0 items-center gap-2">
                        <span className="text-sm font-semibold tabular-nums">
                          {r.display}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <span className={"h-2 w-2 rounded-full " + TONE[r.tone].dot} aria-hidden />
                          {TONE[r.tone].label}
                        </span>
                      </span>
                    )}
                  </m.div>
                );
              })}
            </div>
          )}

          <p className="mt-4 border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">
            이런 근거들이 있습니다 — 매수·매도 권유가 아닙니다. (목업 데이터 ·
            실제 분석은 데이터 연동 후 제공)
          </p>
        </div>
      </div>
    </div>
  );
}
