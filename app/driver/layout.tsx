"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const C = {
  bg:     "#0F172A",
  card:   "#1E293B",
  teal:   "#14B8A6",
  text:   "#F1F5F9",
  muted:  "#94A3B8",
  border: "#334155",
  red:    "#EF4444",
};

/* Hardcoded — will come from global state / context when wired to backend */
const AVAILABLE_COUNT = 3;

const navItems = [
  { href: "/driver/orders",   emoji: "📦", label: "الطلبات",  badge: AVAILABLE_COUNT },
  { href: "/driver/archive",  emoji: "🗄️", label: "الأرشيف",  badge: 0              },
  { href: "/driver/accounts", emoji: "💰", label: "حساباتي", badge: 0              },
];

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  /* Login page: render without bottom nav */
  if (pathname === "/driver/login") {
    return <>{children}</>;
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
      <div className="flex-1 overflow-y-auto">
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
              {/* Emoji + badge wrapper */}
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
              {/* Active indicator dot */}
              {active && (
                <span
                  className="w-1 h-1 rounded-full mt-0.5"
                  style={{ background: C.teal }}
                />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
