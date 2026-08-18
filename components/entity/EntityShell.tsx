"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/* Entity is a customer-style app — light theme, Hala brand orange. */
const C = {
  bg:     "#F8FAFC",
  card:   "#FFFFFF",
  text:   "#1A1A1A",
  muted:  "#6B7280",
  border: "#E5E7EB",
  primary: "#FF6000",
  red:     "#EF4444",
};

export default function EntityShell({ children }: { children: React.ReactNode }) {
  const pathname    = usePathname();
  const isLoginPage = pathname === "/entity/login";

  /* ready starts true on the login page (no auth check needed there),
     false everywhere else — the entity pages are full-page navigations,
     so this initial value is always correct when the shell mounts. */
  const [ready, setReady] = useState(isLoginPage);

  useEffect(() => {
    if (isLoginPage) return;

    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (!data.authenticated || data.user?.type !== "entity") {
          window.location.href = "/entity/login";
        } else {
          setReady(true);
        }
      })
      .catch(() => {
        window.location.href = "/entity/login";
      });
  }, [isLoginPage]);

  /* Login page: render without any auth check */
  if (isLoginPage) return <>{children}</>;

  /* Wait until auth check completes */
  if (!ready) return null;

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    window.location.href = "/entity/login";
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: C.bg,
        color: C.text,
        fontFamily: "var(--font-cairo), Arial, sans-serif",
        direction: "rtl",
      }}
    >
      {/* ── Light header ── */}
      <header
        className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 border-b"
        style={{ background: C.card, borderColor: C.border }}
      >
        <span className="text-xl flex-shrink-0" style={{ color: C.primary }}>🏢</span>
        <div className="flex-1 min-w-0">
          <p className="text-base font-black truncate" style={{ color: C.primary }}>حالا</p>
          <p className="text-xs" style={{ color: C.muted }}>بوابة المنشآت</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition-colors hover:bg-red-500/10"
          style={{ color: C.red }}
        >
          <span>🚪</span>
          <span className="hidden sm:inline">خروج</span>
        </button>
      </header>

      {/* ── Page content ── */}
      <main className="flex-1 p-4 lg:p-6">{children}</main>
    </div>
  );
}
