import { createClient } from "@supabase/supabase-js";

/* Plain database-only client — no auth session, no cookie handling.
   Use this for queries that don't need Supabase Auth (e.g. staff login). */
export const supabasePublic = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);
