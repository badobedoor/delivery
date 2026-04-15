"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

/**
 * Invisible component mounted in the root layout.
 * Listens for auth state changes so it catches the session even when
 * it arrives after the component mounts (e.g. right after OAuth redirect).
 */
export default function UserSync() {
  useEffect(() => {
    console.log("[UserSync] mounted");

    async function syncUser(userId: string, email: string | undefined, fullName: string | undefined) {
      console.log("[UserSync] AUTH USER:", { id: userId, email, fullName });

      /* maybeSingle() → null when row missing, no error */
      const { data: existingUser, error: selectError } = await supabase
        .from("users")
        .select("id")
        .eq("id", userId)
        .maybeSingle();

      console.log("[UserSync] CHECK EXISTING USER:", existingUser, "selectError:", selectError);

      if (selectError) {
        console.error("[UserSync] ERROR (select users):", selectError);
        return;
      }

      if (existingUser) {
        console.log("[UserSync] user already exists, skipping insert");
        return;
      }

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
          },
        ]);

      console.log("[UserSync] INSERT RESULT:", insertData);

      if (insertError) {
        console.error("[UserSync] INSERT ERROR:", insertError);
      }
    }

    /* 1 — Run immediately for any session already present */
    supabase.auth.getUser().then(({ data, error }) => {
      console.log("[UserSync] getUser:", data?.user?.id ?? "null", "error:", error);
      if (data?.user) {
        syncUser(data.user.id, data.user.email, data.user.user_metadata?.full_name);
      }
    });

    /* 2 — Also listen for auth state changes (catches post-OAuth session arrival) */
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
