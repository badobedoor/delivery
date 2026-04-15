"use client";

import Link            from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const C = {
  bg:     "#0F172A",
  card:   "#1E293B",
  teal:   "#14B8A6",
  text:   "#F1F5F9",
  muted:  "#94A3B8",
  border: "#334155",
  red:    "#EF4444",
};

const AVAILABLE_COUNT = 3;

const navItems = [
  { href: "/driver/orders",   emoji: "📦", label: "الطلبات",  badge: AVAILABLE_COUNT },
  { href: "/driver/archive",  emoji: "🗄️", label: "الأرشيف",  badge: 0              },
  { href: "/driver/accounts", emoji: "💰", label: "حساباتي", badge: 0              },
];

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  const pathname    = usePathname();
  const isLoginPage = pathname === "/driver/login";

  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (isLoginPage) { setReady(true); return; }

    /* Read driver session from localStorage */
    let driver = null;
    try {
      const raw = localStorage.getItem("driver_user");
      driver = raw ? JSON.parse(raw) : null;
    } catch { /* ignore parse errors */ }

    if (!driver) {
      /* No session → send to login */
      window.location.href = "/driver/login";
      return;
    }

    /* Driver trying to access anything outside /driver → back to orders */
    if (!pathname.startsWith("/driver")) {
      window.location.href = "/driver/orders";
      return;
    }

    setReady(true);
  }, [isLoginPage, pathname]);

  /* Login page: no bottom nav, no auth check */
  if (isLoginPage) return <>{children}</>;

  /* Wait until localStorage check completes */
  if (!ready) return null;

  function handleLogout() {
    localStorage.removeItem("driver_user");
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
              <div className="relative">
                <span className="text-xl leading-none">{item.emoji}</span>
                {item.badge > 0 && (
                  <span
                    className="absolute -top-1 -left-1 min-w-[16px] h-4 rounded-full text-[9px] font-black flex items-center justify-center px-0.5"
                    style={{ background: C.red, color: "#fff" }}
                  >
                    {item.badge}
                  </span>
                )}
              </div>
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
