import { createServerClient } from "@supabase/ssr";
import { NextResponse }        from "next/server";
import type { NextRequest }    from "next/server";

/* ── Login pages — always public ── */
const ALWAYS_PUBLIC = [
  "/admin/login",
  "/staff/login",
  "/driver/login",
];

/* ── Protected prefixes ── */
const PROTECTED = ["/admin", "/driver"];

/* ── Customer routes that require Supabase session ── */
const CUSTOMER_PATHS = [
  "/about",
  "/account",
  "/address",
  "/cart",
  "/checkout",
  "/coupons",
  "/favorites",
  "/help",
  "/notifications",
  "/offers",
  "/orders",
  "/privacy",
  "/profile",
  "/restaurant",
  "/restaurants",
  "/search",
  "/terms",
];

function isCustomerPath(pathname: string): boolean {
  return CUSTOMER_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

/* ─────────────────────────────────────────────
   Edge-compatible JWT verifier
   (jsonwebtoken uses Node.js APIs not available
   in the Edge runtime — we verify via Web Crypto)
───────────────────────────────────────────── */
type JwtClaims = {
  id:   string;
  role: string;
  type: string;
  name: string;
  exp?: number;
};

function b64urlToBytes(str: string): Uint8Array<ArrayBuffer> {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const padded  = base64.padEnd(
    base64.length + (4 - (base64.length % 4)) % 4,
    "=",
  );
  const binary = atob(padded);
  const buf    = new ArrayBuffer(binary.length);
  const view   = new Uint8Array(buf);
  for (let i = 0; i < binary.length; i++) view[i] = binary.charCodeAt(i);
  return view;
}

async function verifyJwt(token: string): Promise<JwtClaims | null> {
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) return null;

    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, payload, sig] = parts;

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );

    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      b64urlToBytes(sig),
      new TextEncoder().encode(`${header}.${payload}`),
    );

    if (!valid) return null;

    const claims: JwtClaims = JSON.parse(
      new TextDecoder().decode(b64urlToBytes(payload)),
    );

    if (claims.exp && claims.exp < Math.floor(Date.now() / 1000)) return null;

    return claims;
  } catch {
    return null;
  }
}

/* ── Login URL for a given path ── */
function getLoginUrl(request: NextRequest, pathname: string): NextResponse {
  const target = pathname.startsWith("/driver")
    ? "/driver/login"
    : "/admin/login";
  return NextResponse.redirect(new URL(target, request.url));
}

/* ─────────────────────────────────────────────
   Proxy (replaces middleware in Next.js 16)
───────────────────────────────────────────── */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  /* ── Customer route protection (Supabase session) ── */
  if (pathname === "/login" || isCustomerPath(pathname)) {
    const response = NextResponse.next({ request: { headers: request.headers } });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      },
    );

    const { data: { session } } = await supabase.auth.getSession();
    const isLoggedIn = !!session;

    if (isLoggedIn && pathname === "/login") {
      return NextResponse.redirect(new URL("/", request.url));
    }

    if (!isLoggedIn && isCustomerPath(pathname)) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    return response;
  }

  /* ── Already-logged-in redirect for login pages ── */
  if (ALWAYS_PUBLIC.some((p) => pathname.startsWith(p))) {
    const token = request.cookies.get("auth_token")?.value;
    if (token) {
      const claims = await verifyJwt(token);
      if (claims) {
        if (pathname.startsWith("/driver/login") && claims.type === "delivery") {
          return NextResponse.redirect(new URL("/driver/orders", request.url));
        }
        if (
          (pathname.startsWith("/admin/login") || pathname.startsWith("/staff/login")) &&
          claims.type === "staff"
        ) {
          const dest = claims.role === "staff" ? "/admin/orders" : "/admin/dashboard";
          return NextResponse.redirect(new URL(dest, request.url));
        }
      }
    }
    return NextResponse.next();
  }

  /* Only inspect protected prefixes */
  if (!PROTECTED.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  /* ── Verify auth_token cookie ── */
  const token = request.cookies.get("auth_token")?.value;
  if (!token) return getLoginUrl(request, pathname);

  const claims = await verifyJwt(token);
  if (!claims) return getLoginUrl(request, pathname);

  const { role, type } = claims;

  /* ── /admin/* — staff + admin + super_admin (type="staff") ── */
  if (pathname.startsWith("/admin") && type !== "staff") {
    return getLoginUrl(request, pathname);
  }

  /* ── /driver/* — drivers only (type="delivery") ── */
  if (pathname.startsWith("/driver") && type !== "delivery") {
    return getLoginUrl(request, pathname);
  }

  /* ── Within /admin: staff role may only visit allowed pages ── */
  if (pathname.startsWith("/admin") && role === "staff") {
    const STAFF_ALLOWED = ["/admin/orders", "/admin/restaurants", "/admin/drivers"];
    if (!STAFF_ALLOWED.some((p) => pathname.startsWith(p))) {
      return NextResponse.redirect(new URL("/admin/orders", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/driver/:path*",
    "/login",
    "/about/:path*", "/account/:path*", "/address/:path*",
    "/cart/:path*", "/checkout/:path*", "/coupons/:path*",
    "/favorites/:path*", "/help/:path*", "/notifications/:path*",
    "/offers/:path*", "/orders/:path*", "/privacy/:path*",
    "/profile/:path*", "/restaurant/:path*", "/restaurants/:path*",
    "/search/:path*", "/terms/:path*",
    "/about", "/account", "/address", "/cart", "/checkout",
    "/coupons", "/favorites", "/help", "/notifications", "/offers",
    "/orders", "/privacy", "/profile", "/restaurant", "/restaurants",
    "/search", "/terms",
  ],
};
