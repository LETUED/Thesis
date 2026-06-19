"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

// 세션 종료. 그동안 로그아웃 진입점이 없었다(검증 지적). 헤더에 노출.
export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={loading}
      onClick={handleClick}
    >
      {loading ? "로그아웃 중..." : "로그아웃"}
    </Button>
  );
}
