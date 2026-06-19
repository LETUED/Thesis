"use client";

import { Suspense, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

// useSearchParams 는 Suspense 경계 안에서만 prerender 가능 → 본문을 분리.
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectedFrom = searchParams.get("redirectedFrom") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError("이메일 또는 비밀번호를 확인해 주세요.");
        return;
      }

      router.push(redirectedFrom);
      router.refresh();
    });
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <h1 className="text-2xl font-semibold">로그인</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        THESIS 대시보드에 접속합니다.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="email" className="text-sm font-medium">
            이메일
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-foreground/20"
          />
        </div>

        <div>
          <label htmlFor="password" className="text-sm font-medium">
            비밀번호
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-foreground/20"
          />
        </div>

        {error && (
          <p className="text-sm text-[hsl(var(--regime-off-strong))]">{error}</p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background disabled:opacity-60"
        >
          {isPending ? "로그인 중..." : "로그인"}
        </button>
      </form>

      <p className="mt-4 text-sm text-muted-foreground">
        계정이 없으신가요?{" "}
        <Link href="/signup" className="font-medium underline">
          회원가입
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">불러오는 중...</div>}>
      <LoginForm />
    </Suspense>
  );
}
