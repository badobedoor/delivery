"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth }  from "@/hooks/useAuth";
import { signOut }  from "@/lib/auth";

const C = {
  bg:   "#0F172A",
  teal: "#14B8A6",
  muted: "#94A3B8",
};

function AuthLoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background: C.bg }}>
      <div className="flex flex-col items-center gap-3">
        <span className="text-3xl" style={{ color: C.teal }}>⚡</span>
        <p className="text-sm font-semibold animate-pulse" style={{ color: C.muted }}>
          جاري التحقق...
        </p>
      </div>
    </div>
  );
}

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  const pathname = usePathname();
  const router   = useRouter();

  const isLoginPage = pathname === "/staff/login";

  useEffect(() => {
    if (isLoginPage || loading) return;

    if (!user) {
      router.replace("/staff/login");
      return;
    }

    /* Staff are served through admin dashboard; redirect wrong roles */
    if (profile) {
      if (profile.role === "admin" || profile.role === "staff") {
        router.replace("/admin/dashboard");
      } else if (profile.role === "driver") {
        router.replace("/driver/orders");
      } else {
        router.replace("/");
      }
    }
  }, [isLoginPage, loading, user, profile, router]);

  if (isLoginPage) return <>{children}</>;
  if (loading || !user) return <AuthLoadingScreen />;

  /* Staff pages (if any) rendered here */
  return <>{children}</>;
}

/*
  Note: Staff members currently share the admin dashboard UI.
  The /staff/* route is only used for the login page.
  After login, staff are redirected to /admin/dashboard where
  the admin layout applies STAFF_ALLOWED page filtering.
*/
