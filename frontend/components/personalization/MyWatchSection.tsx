"use client";

import * as React from "react";
import Link from "next/link";
import { FlaskConical, Star, Clock } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { Tier } from "@/lib/types";
import type {
  CompanyRef,
  RecentCompany,
  WatchlistItem,
} from "@/lib/personalization/companyId";
import {
  listWatchlist,
} from "@/lib/personalization/watchlist";
import { listRecentlyViewed } from "@/lib/personalization/recentlyViewed";
import { Panel } from "@/components/ui/panel";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { WatchlistButton } from "@/components/personalization/WatchlistButton";

// "내 관심" 클라이언트 섹션 — 관심종목 + 최근 본 기업을 lib/personalization 으로
// 직접 패치(fail-open). 둘 다 비면 교육형 EmptyState 로 /lab 으로 안내한다.
// 데이터/인증 실패 시 빈 목록으로 흘러 화면이 깨지지 않는다.

function toRef(row: CompanyRef): CompanyRef {
  return {
    company_id: row.company_id,
    ticker: row.ticker,
    name: row.name,
    exchange: row.exchange,
  };
}

function CompanyLine({ row }: { row: CompanyRef }) {
  const name = row.name ?? row.ticker ?? row.company_id;
  return (
    <div className="min-w-0">
      <p className="truncate text-sm font-medium text-foreground">{name}</p>
      <div className="mt-0.5 flex items-center gap-1.5">
        {row.ticker ? (
          <Chip variant="muted" className="font-mono">
            {row.ticker}
          </Chip>
        ) : null}
        {row.exchange ? (
          <span className="text-xs text-muted-foreground">{row.exchange}</span>
        ) : null}
      </div>
    </div>
  );
}

export function MyWatchSection({ tier }: { tier: Tier }) {
  const [watchlist, setWatchlist] = React.useState<WatchlistItem[]>([]);
  const [recent, setRecent] = React.useState<RecentCompany[]>([]);
  const [loaded, setLoaded] = React.useState(false);

  const refresh = React.useCallback(async () => {
    const [w, r] = await Promise.all([listWatchlist(), listRecentlyViewed()]);
    setWatchlist(w);
    setRecent(r);
  }, []);

  React.useEffect(() => {
    let active = true;
    void Promise.all([listWatchlist(), listRecentlyViewed()]).then(
      ([w, r]) => {
        if (!active) return;
        setWatchlist(w);
        setRecent(r);
        setLoaded(true);
      },
    );
    return () => {
      active = false;
    };
  }, []);

  // 둘 다 로딩 끝났고 비었으면 교육형 안내.
  if (loaded && watchlist.length === 0 && recent.length === 0) {
    return (
      <EmptyState
        variant="teaching"
        icon={<Star className="h-5 w-5" aria-hidden />}
        title="아직 담은 기업이 없어요"
        description="기업을 검색해 관심에 담아보세요. 종목 검색이나 조립 분석에서 별표로 담으면 여기 모여요."
        action={
          <div className="flex flex-wrap gap-2">
            {/* screener(단순 검색)를 먼저 — /lab(beta 조립)보다 입문자 부담이 적다 */}
            <Link href="/screener">
              <Button variant="outline">기업 검색하기</Button>
            </Link>
            <Link href="/lab">
              <Button variant="outline" className="gap-2">
                <FlaskConical className="h-4 w-4" aria-hidden />
                조립 분석
              </Button>
            </Link>
          </div>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <section aria-labelledby="watchlist-heading">
        <div className="mb-2 flex items-center gap-2">
          <Star className="h-4 w-4 text-muted-foreground" aria-hidden />
          <h2 id="watchlist-heading" className="text-sm font-semibold">
            관심종목
          </h2>
          <span className="text-xs text-muted-foreground">
            ({watchlist.length})
          </span>
        </div>

        {watchlist.length === 0 ? (
          <Panel tone="muted" className="py-6">
            <p className="text-center text-sm text-muted-foreground">
              아직 관심에 담은 종목이 없어요. 기업을 살펴보다 별표로 담아보세요.
            </p>
          </Panel>
        ) : (
          <ul className="space-y-2">
            {watchlist.map((row) => (
              <li key={row.company_id}>
                <Panel className="flex items-center justify-between gap-3 py-3">
                  <CompanyLine row={row} />
                  <WatchlistButton
                    company={toRef(row)}
                    tier={tier}
                    size="sm"
                  />
                </Panel>
              </li>
            ))}
          </ul>
        )}

        {/* 해제는 별표 버튼으로 — 클릭 후 짧게 목록을 재동기화해 사라진 항목을 반영. */}
        {watchlist.length > 0 ? (
          <button
            type="button"
            onClick={() => void refresh()}
            className={cn(
              "mt-2 text-xs text-muted-foreground underline-offset-2",
              "hover:text-foreground hover:underline",
              "focus-visible:outline-none focus-visible:underline focus-visible:text-foreground",
            )}
          >
            목록 새로고침
          </button>
        ) : null}
      </section>

      <section aria-labelledby="recent-heading">
        <div className="mb-2 flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" aria-hidden />
          <h2 id="recent-heading" className="text-sm font-semibold">
            최근 본 기업
          </h2>
          <span className="text-xs text-muted-foreground">
            ({recent.length})
          </span>
        </div>

        {recent.length === 0 ? (
          <Panel tone="muted" className="py-6">
            <p className="text-center text-sm text-muted-foreground">
              최근 살펴본 기업이 여기 쌓여요.
            </p>
          </Panel>
        ) : (
          <ul className="space-y-2">
            {recent.map((row) => (
              <li key={row.company_id}>
                <Panel className="flex items-center justify-between gap-3 py-3">
                  <CompanyLine row={row} />
                  <WatchlistButton
                    company={toRef(row)}
                    tier={tier}
                    size="sm"
                  />
                </Panel>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
