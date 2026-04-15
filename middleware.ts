import { createServerClient } from "@supabase/ssr";
import { NextResponse }        from "next/server";
import type { NextRequest }    from "next/server";

/*
 * Only /admin/* is protected by Supabase Auth (JWT / cookie session).
 * /driver/* and /staff/* use localStorage-based sessions handled in their
 * respective layouts — the middleware must not touch them.
 */
const PROTECTED: { prefix: string; login: string }[] = [
  { prefix: "/admin", login: "/admin/login" },
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

  /* Staff users are authenticated via localStorage + a "staff_session" cookie */
  if (request.cookies.get("staff_session")) {
    return NextResponse.next();
  }

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
  /* Only run on /admin/* — driver and staff use localStorage auth in their layouts */
  matcher: ["/admin/:path*"],
};
