"use client";

import Link            from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import NetworkStatus from "@/components/ui/NetworkStatus";
import { supabase } from "@/lib/supabase";

function DriverNotificationSound() {
  useEffect(() => {
    const channel = supabase
      .channel("driver-new-orders-global")
      .on("postgres_changes", {
        event:  "UPDATE",
        schema: "public",
        table:  "orders",
        filter: "status=eq.pending",
      }, () => {
        try {
          new Audio("/sounds/driver_new_order.mp3").play().catch(() => {});
        } catch { /* ignore */ }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return null;
}

const C = {
  bg:     "#0F172A",
  card:   "#1E293B",
  teal:   "#14B8A6",
  text:   "#F1F5F9",
  muted:  "#94A3B8",
  border: "#334155",
  red:    "#EF4444",
};

const navItems = [
  { href: "/driver/orders",   emoji: "📦", label: "الطلبات"  },
  { href: "/driver/accounts", emoji: "💰", label: "حساباتي" },
];

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  const pathname    = usePathname();
  const isLoginPage = pathname === "/driver/login";

  const [ready, setReady] = useState(false);

  /* ── PWA manifest for the driver portal ── */
  useEffect(() => {
    const link = document.createElement("link");
    link.rel  = "manifest";
    link.href = "/manifest-driver.json";
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, []);

  useEffect(() => {
    if (isLoginPage) { setReady(true); return; }

    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (!data.authenticated) {
          window.location.href = "/driver/login";
        } else {
          setReady(true);
        }
      })
      .catch(() => {
        window.location.href = "/driver/login";
      });
  }, [isLoginPage]);

  /* Login page: no bottom nav, no auth check */
  if (isLoginPage) return <>{children}</>;

  /* Wait until auth check completes */
  if (!ready) return null;

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    window.location.href = "/driver/login";
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
      <NetworkStatus />
      <DriverNotificationSound />

      {/* ── Page content ── */}
      <div className="flex-1 overflow-y-auto pb-20">
        {children}
      </div>

      {/* ── Bottom Navigation ── */}
      <nav
        className="fixed bottom-0 inset-x-0 z-30 flex items-stretch border-t"
        style={{ background: C.card, borderColor: C.border }}
      >
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 py-3 transition-colors"
              style={{ color: active ? C.teal : C.muted }}
            >
              <span className="text-xl leading-none">{item.emoji}</span>
              <span className="text-[11px] font-bold">{item.label}</span>
              {active && (
                <span className="w-1 h-1 rounded-full mt-0.5" style={{ background: C.teal }} />
              )}
            </Link>
          );
        })}

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 py-3 transition-colors"
          style={{ color: C.red }}
        >
          <span className="text-xl leading-none">🚪</span>
          <span className="text-[11px] font-bold">خروج</span>
        </button>
      </nav>
    </div>
  );
}
