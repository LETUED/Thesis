"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

// 세션 만료 감지(검증 지적): 서버가 로그인 사용자에게만 이 페이지를 렌더하므로,
// 클라이언트 getSession 이 null 이면 그 사이 만료된 것 → 오탐 위험 낮음.
// 중립 톤으로 알리고 재로그인 유도(공포 톤 금지).
export function SessionWatch() {
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    async function check() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (active) setExpired(session === null);
    }

    check();
    window.addEventListener("focus", check);
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setExpired(session === null);
    });

    return () => {
      active = false;
      window.removeEventListener("focus", check);
      sub.subscription.unsubscribe();
    };
  }, []);

  if (!expired) return null;

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm">
      <span className="text-muted-foreground">
        세션이 만료되어 일부 기능이 제한됩니다.
      </span>
      <Link
        href="/login?redirectedFrom=/dashboard"
        className="shrink-0 font-medium underline"
      >
        다시 로그인
      </Link>
    </div>
  );
}
