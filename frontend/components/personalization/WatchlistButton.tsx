"use client";

import * as React from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { Tier } from "@/lib/types";
import type { CompanyRef } from "@/lib/personalization/companyId";
import {
  addToWatchlist,
  listWatchlist,
  removeFromWatchlist,
} from "@/lib/personalization/watchlist";
import { UpgradeModal } from "@/components/billing/UpgradeModal";

// 관심(별) 토글 버튼. 마운트 시 현재 워치 여부를 조회하고, 클릭으로 add/remove 한다.
// 낙관적 갱신 후 실패하면 직전 상태로 롤백한다. Free 상한 도달 시 토글 대신
// 업셀 모달(source="watchlist_limit")을 띄운다 — '담아야 한다' 강요가 아닌 접근 안내.
// 색만으로 상태를 표현하지 않도록 aria-pressed + sr-only 라벨 + 채움/외곽선 아이콘을 함께 쓴다.

type Size = "sm" | "md";

const SIZE_BTN: Record<Size, string> = {
  sm: "h-8 w-8",
  md: "h-9 w-9",
};

const SIZE_ICON: Record<Size, string> = {
  sm: "h-4 w-4",
  md: "h-[18px] w-[18px]",
};

export interface WatchlistButtonProps {
  company: CompanyRef;
  tier: Tier;
  size?: Size;
  className?: string;
}

export function WatchlistButton({
  company,
  tier,
  size = "md",
  className,
}: WatchlistButtonProps) {
  const [watched, setWatched] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [upsellOpen, setUpsellOpen] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    void listWatchlist().then((items) => {
      if (!active) return;
      setWatched(items.some((w) => w.company_id === company.company_id));
    });
    return () => {
      active = false;
    };
  }, [company.company_id]);

  async function handleToggle() {
    if (pending) return;

    if (watched) {
      setWatched(false);
      setPending(true);
      const ok = await removeFromWatchlist(company.company_id);
      setPending(false);
      if (!ok) setWatched(true); // 롤백
      return;
    }

    setWatched(true);
    setPending(true);
    const result = await addToWatchlist(company);
    setPending(false);
    if (!result.ok) {
      setWatched(false); // 롤백
      if (result.reason === "limit") setUpsellOpen(true);
    }
  }

  const label = company.name ?? company.ticker ?? "이 종목";
  const actionLabel = watched
    ? `${label} 관심종목에서 제거`
    : `${label} 관심종목에 추가`;

  return (
    <>
      <button
        type="button"
        onClick={handleToggle}
        disabled={pending}
        aria-pressed={watched}
        title={actionLabel}
        className={cn(
          "inline-flex items-center justify-center rounded-md border border-border text-muted-foreground transition-colors",
          "hover:bg-muted hover:text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20",
          "disabled:cursor-not-allowed disabled:opacity-60",
          watched && "text-foreground",
          SIZE_BTN[size],
          className,
        )}
      >
        <Star
          aria-hidden
          className={cn(
            SIZE_ICON[size],
            watched && "fill-current",
          )}
        />
        <span className="sr-only">{actionLabel}</span>
      </button>

      {tier === "free" ? (
        <UpgradeModal
          open={upsellOpen}
          onClose={() => setUpsellOpen(false)}
          source="watchlist_limit"
        />
      ) : null}
    </>
  );
}
