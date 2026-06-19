"use client";

import { useState } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { ApiError, createCheckout } from "@/lib/api";

// 클릭 → 로그인 세션 토큰 확보 → 백엔드 Checkout URL 발급 → Stripe 결제 페이지로 이동.
// 미로그인은 로그인 페이지로 보낸다. '지금 결제' 강요 톤 금지 — 선택지를 여는 버튼.
export function UpgradeButton({
  label = "Pro로 업그레이드",
  variant = "default",
  size = "default",
  className,
}: {
  label?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
}) {
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
      const { url } = await createCheckout(session.access_token);
      window.location.href = url;
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : "결제 페이지를 여는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.",
      );
      setLoading(false);
    }
  }

  return (
    <div>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        disabled={loading}
        onClick={handleClick}
      >
        {loading ? "이동 중..." : label}
      </Button>
      {error ? (
        <p className="mt-2 text-xs text-muted-foreground">{error}</p>
      ) : null}
    </div>
  );
}
