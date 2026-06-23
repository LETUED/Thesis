"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { UpgradeButton } from "@/components/billing/UpgradeButton";
import {
  PLANS,
  PLAN_PRICING,
  featureMatrix,
  getPricing,
  getPlan,
  formatPrice,
  annualSavingsPercent,
  maxAnnualSavingsPercent,
  type PlanId,
  type BillingPeriod,
  type FeatureRow,
} from "@/lib/plans";

// 3티어 비교표. 가격·기능은 lib/plans 단일출처에서만(하드코딩 금지).
// 고가 티어(Quant)가 Pro 를 앵커하도록 우측에 배치, Pro "가장 인기" 강조.
// 연간/월 토글 + 최대 절약률 콜아웃. 과신 방지 톤(행동 강요 카피 없음).
export interface PlanComparisonProps {
  compact?: boolean;
  defaultPeriod?: BillingPeriod;
  onSelect?: (tier: PlanId) => void;
}

function priceForPeriod(id: PlanId, period: BillingPeriod): number | null {
  const p = getPricing(id);
  return period === "year" ? p.annualPerMonth : p.monthlyPrice;
}

export function PlanComparison({
  compact = false,
  defaultPeriod = "month",
  onSelect,
}: PlanComparisonProps) {
  const [period, setPeriod] = useState<BillingPeriod>(defaultPeriod);
  const maxSavings = maxAnnualSavingsPercent();

  return (
    <div className={cn("w-full", compact ? "text-sm" : "")}>
      <BillingToggle period={period} onChange={setPeriod} maxSavings={maxSavings} />

      <div
        className={cn(
          "mt-6 grid gap-4",
          compact ? "grid-cols-1" : "md:grid-cols-3",
        )}
      >
        {PLAN_PRICING.map((pricing) => {
          const plan = getPlan(pricing.id);
          const amount = priceForPeriod(pricing.id, period);
          const savings = annualSavingsPercent(pricing);

          return (
            <PlanCard
              key={pricing.id}
              id={pricing.id}
              name={plan.name}
              cta={plan.cta}
              href={plan.href}
              features={plan.features}
              popular={pricing.popular}
              currency={pricing.currency}
              amount={amount}
              period={period}
              savings={savings}
              compact={compact}
              onSelect={onSelect}
            />
          );
        })}
      </div>

      <FeatureTable compact={compact} />
    </div>
  );
}

function BillingToggle({
  period,
  onChange,
  maxSavings,
}: {
  period: BillingPeriod;
  onChange: (p: BillingPeriod) => void;
  maxSavings: number;
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <div
        role="radiogroup"
        aria-label="결제 주기"
        className="inline-flex rounded-lg border border-border bg-muted/40 p-1"
      >
        <ToggleOption
          active={period === "month"}
          label="월 결제"
          onClick={() => onChange("month")}
        />
        <ToggleOption
          active={period === "year"}
          label="연간 결제"
          onClick={() => onChange("year")}
        />
      </div>
      {maxSavings > 0 ? (
        <Chip variant="default" className="border-regime-on/40 text-regime-on">
          연간 결제 시 최대 {maxSavings}% 절약
        </Chip>
      ) : null}
    </div>
  );
}

function ToggleOption({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={cn(
        "rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20",
        active
          ? "bg-card text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

function PlanCard({
  id,
  name,
  cta,
  href,
  features,
  popular,
  currency,
  amount,
  period,
  savings,
  compact,
  onSelect,
}: {
  id: PlanId;
  name: string;
  cta: string;
  href: string | null;
  features: readonly string[];
  popular: boolean;
  currency: string;
  amount: number | null;
  period: BillingPeriod;
  savings: number;
  compact: boolean;
  onSelect?: (tier: PlanId) => void;
}) {
  const isPaid = amount !== null && amount > 0;
  const showAnnualNote = period === "year" && isPaid && savings > 0;

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-xl border bg-card p-6",
        popular
          ? "border-regime-on/50 ring-1 ring-regime-on/30"
          : "border-border",
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{name}</span>
        {popular ? (
          <Chip
            variant="default"
            className="border-regime-on/40 bg-regime-on/15 text-regime-on"
          >
            가장 인기
          </Chip>
        ) : null}
      </div>

      <div className="mt-3 flex items-baseline gap-1">
        <span className="text-2xl font-semibold tabular-nums">
          {amount === null ? "준비 중" : formatPrice(amount, currency)}
        </span>
        {amount !== null ? (
          <span className="text-sm text-muted-foreground">
            {amount > 0 ? "/월" : ""}
          </span>
        ) : null}
      </div>
      <p className="mt-1 h-4 text-xs text-muted-foreground">
        {showAnnualNote ? `연간 결제 · ${savings}% 절약` : ""}
      </p>

      <ul className="mt-5 flex-1 space-y-2 text-sm text-muted-foreground">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Check
              className="mt-0.5 h-4 w-4 shrink-0 text-regime-on"
              aria-hidden
            />
            {f}
          </li>
        ))}
      </ul>

      <div className="mt-6">
        <PlanCardAction
          id={id}
          cta={cta}
          href={href}
          isPaid={isPaid}
          popular={popular}
          compact={compact}
          onSelect={onSelect}
        />
      </div>
    </div>
  );
}

function PlanCardAction({
  id,
  cta,
  href,
  isPaid,
  popular,
  compact,
  onSelect,
}: {
  id: PlanId;
  cta: string;
  href: string | null;
  isPaid: boolean;
  popular: boolean;
  compact: boolean;
  onSelect?: (tier: PlanId) => void;
}) {
  const size = compact ? "sm" : "default";

  // 준비 중(href 없음) — 비활성.
  if (!href) {
    return (
      <Button variant="locked" size={size} className="w-full" disabled>
        {cta}
      </Button>
    );
  }

  // onSelect 가 주어지면(모달/사이드 컨텍스트) 클릭을 위임한다.
  if (onSelect) {
    return (
      <Button
        type="button"
        variant={popular ? "default" : "outline"}
        size={size}
        className="w-full"
        onClick={() => onSelect(id)}
      >
        {cta}
      </Button>
    );
  }

  // 유료 결제 플로우는 UpgradeButton 재사용(세션 확인 → Checkout).
  if (isPaid) {
    return (
      <UpgradeButton
        label={cta}
        variant={popular ? "default" : "outline"}
        size={size}
        className="w-full"
      />
    );
  }

  // 무료 플랜 — 가입 링크.
  return (
    <Link href={href} className="block">
      <Button
        variant={popular ? "default" : "outline"}
        size={size}
        className="w-full"
      >
        {cta}
      </Button>
    </Link>
  );
}

function FeatureTable({ compact }: { compact: boolean }) {
  if (compact) return null;

  const cols: { id: PlanId; label: string }[] = PLANS.map((p) => ({
    id: p.id,
    label: p.name,
  }));

  return (
    <div className="mt-10 overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">플랜별 기능 비교표</caption>
        <thead>
          <tr className="border-b border-border">
            <th scope="col" className="py-3 pr-4 text-left font-medium">
              기능
            </th>
            {cols.map((c) => (
              <th
                key={c.id}
                scope="col"
                className="px-4 py-3 text-center font-medium"
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {featureMatrix.map((row) => (
            <FeatureTableRow key={row.feature} row={row} cols={cols} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FeatureTableRow({
  row,
  cols,
}: {
  row: FeatureRow;
  cols: { id: PlanId; label: string }[];
}) {
  return (
    <tr className="border-b border-border/60">
      <th scope="row" className="py-3 pr-4 text-left font-normal text-muted-foreground">
        {row.feature}
      </th>
      {cols.map((c) => {
        const included = row[c.id];
        return (
          <td key={c.id} className="px-4 py-3 text-center">
            {included ? (
              <>
                <Check
                  className="mx-auto h-4 w-4 text-regime-on"
                  aria-hidden
                />
                <span className="sr-only">{c.label} 포함</span>
              </>
            ) : (
              <>
                <Minus
                  className="mx-auto h-4 w-4 text-muted-foreground/50"
                  aria-hidden
                />
                <span className="sr-only">{c.label} 미포함</span>
              </>
            )}
          </td>
        );
      })}
    </tr>
  );
}
