import { createClient } from "@supabase/supabase-js";

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/* Browser singleton — used in client components and hooks */
export const supabase = createClient(supabaseUrl, supabaseAnon);
