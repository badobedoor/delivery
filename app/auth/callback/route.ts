import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * OAuth callback handler (Google sign-in).
 *
 * KEY FIX: createSupabaseServerClient() (which uses next/headers cookies())
 * cannot write cookies in a Route Handler — next/headers is read-only there.
 * We build the client inline so we can attach the session cookies directly
 * onto the NextResponse redirect, which is the only way to get them to the browser.
 *
 * Origin resolution priority (behind Nginx reverse proxy):
 *   1. x-forwarded-proto + x-forwarded-host  (from the proxy)
 *   2. NEXT_PUBLIC_SITE_URL                   (explicit config)
 *   3. new URL(request.url).origin            (fallback — may be internal)
 */
export async function GET(request: NextRequest) {
  /* Resolve the public origin — prefer reverse-proxy headers over everything */
  const proto = request.headers.get("x-forwarded-proto");
  const host  = request.headers.get("x-forwarded-host");
  const publicSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  const origin =
    proto && host
      ? `${proto}://${host}`
      : publicSiteUrl ?? new URL(request.url).origin;

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/?error=missing_code`);
  }

  /* Build the redirect response first so we can attach cookies to it */
  const redirectTo = `${origin}/`;
  const response   = NextResponse.redirect(redirectTo);

  /* Build the Supabase client wired to the *response* cookies */
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(toSet) {
          /* Write session cookies onto the redirect response */
          toSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

  if (sessionError || !data.session) {
    return NextResponse.redirect(`${origin}/?error=auth_failed`);
  }

  const user   = data.session.user;
  const userId = user.id;
  const name   = user.user_metadata?.full_name ?? null;
  const email  = user.email ?? null;

  /* Upsert profiles row */
  await supabase.from("profiles").upsert(
    { id: userId, name, role: "customer" },
    { onConflict: "id", ignoreDuplicates: true },
  );

  /* Check if user already exists in "users" */
  const { data: existingUser, error: selectError } = await supabase
    .from("users")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (selectError) {
    console.error("[callback] ERROR (select users):", selectError.message, selectError);
  }

  if (!existingUser && !selectError) {
    const insertResult = await supabase.from("users").insert([
      {
        id:           userId,
        name:         name || email || "مستخدم",
        email,
        phone:        null,
        total_orders: 0,
      },
    ]);

    if (insertResult.error) {
      console.error("[callback] ERROR (insert users):", insertResult.error.message, insertResult.error);
    }
  }

  /* Return the redirect — session cookies are already on this response */
  return response;
}
