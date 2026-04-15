"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

/**
 * Invisible component mounted in the root layout.
 * On every login / session refresh:
 *   1. Inserts the user into "users" if they don't exist yet.
 *   2. Checks is_blocked — signs out and redirects blocked users immediately.
 */
export default function UserSync() {
  useEffect(() => {
    console.log("[UserSync] mounted");

    async function syncUser(userId: string, email: string | undefined, fullName: string | undefined) {
      console.log("[UserSync] AUTH USER:", { id: userId, email, fullName });

      /* ── Fetch the user row (or confirm it needs to be created) ── */
      const { data: existingUser, error: selectError } = await supabase
        .from("users")
        .select("id, is_blocked")
        .eq("id", userId)
        .maybeSingle();

      console.log("[UserSync] CHECK EXISTING USER:", existingUser, "selectError:", selectError);

      if (selectError) {
        console.error("[UserSync] ERROR (select users):", selectError);
        return;
      }

      /* ── Insert if first login ── */
      if (!existingUser) {
        console.log("[UserSync] INSERT ATTEMPT");

        const { data: insertData, error: insertError } = await supabase
          .from("users")
          .insert([
            {
              id:           userId,
              name:         fullName || email || "مستخدم",
              email:        email ?? null,
              phone:        null,
              total_orders: 0,
              is_blocked:   false,
            },
          ]);

        console.log("[UserSync] INSERT RESULT:", insertData);

        if (insertError) {
          console.error("[UserSync] INSERT ERROR:", insertError);
        }

        return; /* newly created users are never blocked */
      }

      /* ── Block check ── */
      console.log("[UserSync] is_blocked:", existingUser.is_blocked);

      if (existingUser.is_blocked) {
        alert("تم حظر هذا الحساب. يرجى التواصل مع الدعم.");
        await supabase.auth.signOut();
        window.location.href = "/login";
      }
    }

    /* 1 — Run immediately for any session already present */
    supabase.auth.getUser().then(({ data, error }) => {
      console.log("[UserSync] getUser:", data?.user?.id ?? "null", "error:", error);
      if (data?.user) {
        syncUser(data.user.id, data.user.email, data.user.user_metadata?.full_name);
      }
    });

    /* 2 — Catch post-OAuth session arrival and token refreshes */
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("[UserSync] onAuthStateChange event:", event, "user:", session?.user?.id ?? "null");

      if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session?.user) {
        syncUser(session.user.id, session.user.email, session.user.user_metadata?.full_name);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return null;
}
