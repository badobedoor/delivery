import { supabase } from "./supabase";

export type UserRole = "admin" | "staff" | "driver" | "customer";

export type Profile = {
  id:         string;
  name:       string | null;
  role:       UserRole;
  phone:      string | null;
  created_at: string;
};

/* ── Sign in with email + password ── */
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  return data;
}

/* ── Sign out ── */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

/* ── Get current authenticated user ── */
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/* ── Fetch profile row from profiles table ── */
export async function getUserProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, role, phone, created_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("PROFILE ERROR:", error.message, error);
    return null;
  }

  return data as Profile | null;
}

/* ── Google OAuth (for customer sign-in) ── */
export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  if (error) throw new Error(error.message);
  return data;
}

/* ── Insert a customer profile on first Google sign-in ── */
export async function ensureCustomerProfile(
  userId: string,
  name: string | null,
) {
  const existing = await getUserProfile(userId);
  if (existing) return existing;

  const { data, error } = await supabase
    .from("profiles")
    .insert({ id: userId, name, role: "customer" })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Profile;
}

/* ── Map role → default landing page ── */
export function getRoleRedirect(role: UserRole): string {
  switch (role) {
    case "admin":
    case "staff":
      return "/admin/dashboard";
    case "driver":
      return "/driver/orders";
    case "customer":
    default:
      return "/";
  }
}

/*
  ── SQL to run in Supabase SQL editor ──

  create table if not exists public.profiles (
    id         uuid primary key references auth.users (id) on delete cascade,
    name       text,
    role       text not null default 'customer'
                 check (role in ('admin', 'staff', 'driver', 'customer')),
    phone      text,
    created_at timestamptz not null default now()
  );

  alter table public.profiles enable row level security;

  -- Users can read their own profile
  create policy "users can read own profile"
    on public.profiles for select
    using (auth.uid() = id);

  -- Users can update their own profile
  create policy "users can update own profile"
    on public.profiles for update
    using (auth.uid() = id);

  -- Allow insert during registration
  create policy "users can insert own profile"
    on public.profiles for insert
    with check (auth.uid() = id);
*/
