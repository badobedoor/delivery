import { createBrowserClient } from "@supabase/ssr";

/* Browser singleton using @supabase/ssr so the session is stored in
   cookies (not localStorage). This makes the session visible to the
   middleware's createServerClient and prevents redirect loops. */
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);
