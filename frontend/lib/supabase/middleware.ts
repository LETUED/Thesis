import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

// 결론(국면·자산배분)은 무료 — /dashboard·/allocation 은 익명도 접근(설계철학 6: 결론 무료/근거 유료).
// 근거 상세(/indicators)·개인화 영역(/lab·/portfolio·/screener·/settings)만 로그인 게이트.
const PROTECTED_PREFIXES = [
  "/indicators",
  "/lab",
  "/portfolio",
  "/screener",
  "/settings",
];

// 경로가 로그인 보호 대상인지 판정. updateSession(Supabase 의존)과 분리해 회귀 테스트가 가능하도록 export.
export function isProtectedPath(path: string): boolean {
  return PROTECTED_PREFIXES.some((p) => path.startsWith(p));
}

export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getUser()를 호출해 세션 토큰을 리프레시한다.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  if (isProtectedPath(path) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectedFrom", path);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
