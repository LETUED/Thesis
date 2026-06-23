import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isProtectedPath } from "@/lib/auth/guards";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

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

  // 게스트 열람: 보호 경로(설정·포트폴리오)만 미로그인 시 차단. 결론 페이지는 공개.
  // 토큰 리프레시(위 getUser)는 보호 여부와 무관하게 모든 경로에서 실행돼 세션이 유지된다.
  if (isProtectedPath(path) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectedFrom", path);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
