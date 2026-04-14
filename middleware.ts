import { createServerClient } from "@supabase/ssr";
import { NextResponse }        from "next/server";
import type { NextRequest }    from "next/server";

/* Routes that require a session, paired with their login page */
const PROTECTED: { prefix: string; login: string }[] = [
  { prefix: "/admin", login: "/admin/login" },
  { prefix: "/driver", login: "/driver/login" },
  { prefix: "/staff",  login: "/staff/login"  },
];

/* Pages that are always public even under a protected prefix */
const ALWAYS_PUBLIC = [
  "/admin/login",
  "/driver/login",
  "/staff/login",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  /* Always allow public paths */
  if (ALWAYS_PUBLIC.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  /* Only inspect protected prefixes */
  const route = PROTECTED.find((r) => pathname.startsWith(r.prefix));
  if (!route) return NextResponse.next();

  /* Build a response so @supabase/ssr can refresh cookies */
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(toSet) {
          toSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  /* getUser() validates the JWT with Supabase (not just the cookie) */
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL(route.login, request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  /* Run on every /admin/*, /driver/*, /staff/* request */
  matcher: ["/admin/:path*", "/driver/:path*", "/staff/:path*"],
};
