import { NextResponse }          from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

/**
 * OAuth callback handler (Google sign-in).
 * Supabase redirects here with ?code=... after the user approves.
 * We exchange the code for a session, ensure the profile row exists,
 * then redirect to the correct page for the user's role.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/?error=missing_code`);
  }

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session) {
    return NextResponse.redirect(`${origin}/?error=auth_failed`);
  }

  const userId = data.session.user.id;
  const name   = data.session.user.user_metadata?.full_name ?? null;

  /* Upsert a customer profile if this is the first login */
  await supabase.from("profiles").upsert(
    { id: userId, name, role: "customer" },
    { onConflict: "id", ignoreDuplicates: true },
  );

  /* Redirect customers to the home page */
  return NextResponse.redirect(`${origin}/`);
}
