"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const supabase = createClient();
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (signUpError) {
        setError("가입에 실패했습니다. 입력값을 확인해 주세요.");
        return;
      }

      setDone(true);
    });
  }

  if (done) {
    return (
      <main
        id="main"
        tabIndex={-1}
        className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4 outline-none"
      >
        <h1 className="text-2xl font-semibold">메일을 확인해 주세요</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {email} 으로 확인 메일을 보냈습니다. 메일의 링크를 눌러 가입을
          완료하면 로그인할 수 있습니다.
        </p>
        <Link href="/login" className="mt-6 text-sm font-medium underline">
          로그인으로 이동
        </Link>
      </main>
    );
  }

  return (
    <main
      id="main"
      tabIndex={-1}
      className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4 outline-none"
    >
      <h1 className="text-2xl font-semibold">회원가입</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        이메일로 THESIS 계정을 만듭니다.
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
            autoComplete="new-password"
            required
            minLength={6}
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
          {isPending ? "가입 중..." : "회원가입"}
        </button>
      </form>

      <p className="mt-4 text-sm text-muted-foreground">
        이미 계정이 있으신가요?{" "}
        <Link href="/login" className="font-medium underline">
          로그인
        </Link>
      </p>
    </main>
  );
}
