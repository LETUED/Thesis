"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { ApiError, createPortal } from "@/lib/api";

// 구독 중인 사용자가 취소/카드 변경을 할 수 있는 Stripe 고객 포털로 이동.
export function ManageSubscriptionButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = "/login?redirectedFrom=/dashboard";
        return;
      }
      const { url } = await createPortal(session.access_token);
      window.location.href = url;
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : "구독 관리 페이지를 여는 중 문제가 발생했습니다.",
      );
      setLoading(false);
    }
  }

  return (
    <div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={loading}
        onClick={handleClick}
      >
        {loading ? "이동 중..." : "구독 관리"}
      </Button>
      {error ? (
        <p className="mt-2 text-xs text-muted-foreground">{error}</p>
      ) : null}
    </div>
  );
}
