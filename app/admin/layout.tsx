"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const C = {
  bg:     "#0F172A",
  card:   "#1E293B",
  teal:   "#14B8A6",
  text:   "#F1F5F9",
  muted:  "#94A3B8",
  border: "#334155",
};

const navLinks = [
  { emoji: "📊", label: "الرئيسية",  href: "/admin/dashboard"  },
  { emoji: "📦", label: "الطلبات",   href: "/admin/orders"      },
  { emoji: "🍔", label: "المطاعم",   href: "/admin/restaurants" },
  { emoji: "🗺️", label: "الأحياء",   href: "/admin/areas"       },
  { emoji: "🛵", label: "الدلفري",   href: "/admin/drivers"     },
  { emoji: "🎟️", label: "الكوبونات", href: "/admin/coupons"     },
  { emoji: "💰", label: "الحسابات",  href: "/admin/accounts"    },
  { emoji: "⚙️", label: "الإعدادات", href: "/admin/settings"    },
];

const pageTitle: Record<string, string> = {
  "/admin/dashboard":   "الرئيسية",
  "/admin/orders":      "الطلبات",
  "/admin/restaurants": "المطاعم",
  "/admin/areas":       "الأحياء",
  "/admin/drivers":     "الدلفري",
  "/admin/coupons":     "الكوبونات",
  "/admin/accounts":    "الحسابات",
  "/admin/settings":    "الإعدادات",
  "/admin/users":       "المستخدمون",
};

function HamburgerIcon({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round">
      <path d="M3 12h18M3 6h18M3 18h18" />
    </svg>
  );
}

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  return (
    <aside className="flex flex-col h-full w-[260px]" style={{ background: C.card }}>
      <div className="px-6 py-6 border-b" style={{ borderColor: C.border }}>
        <p className="text-xl font-black" style={{ color: C.teal }}>حالا</p>
        <p className="text-xs mt-0.5" style={{ color: C.muted }}>لوحة التحكم</p>
      </div>
      <nav className="flex-1 px-3 py-4 overflow-y-auto flex flex-col gap-1">
        {navLinks.map((link) => {
          const active = pathname.startsWith(link.href);
          return (
            <Link key={link.href} href={link.href} onClick={onClose}
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
              style={{ background: active ? C.teal : "transparent", color: active ? "#fff" : C.muted }}>
              <span className="text-base">{link.emoji}</span>
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-3 py-4 border-t" style={{ borderColor: C.border }}>
        <button className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold w-full hover:bg-red-500/10 transition-colors"
          style={{ color: "#EF4444" }}>
          <span>🚪</span>تسجيل الخروج
        </button>
      </div>
    </aside>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [desktopOpen, setDesktopOpen] = useState(true);
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const pathname = usePathname();
  const title = pageTitle[pathname] ?? "لوحة التحكم";

  return (
    <div className="min-h-screen flex"
      style={{ background: C.bg, color: C.text, fontFamily: "var(--font-cairo), Arial, sans-serif" }}>

      {/* ── Desktop Sidebar ── */}
      {desktopOpen && (
        <div className="hidden lg:block fixed top-0 bottom-0 left-0 w-[260px] z-30"
          style={{ borderRight: `1px solid ${C.border}` }}>
          <SidebarContent />
        </div>
      )}

      {/* ── Mobile Drawer ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <div className="relative z-50 h-full" style={{ borderRight: `1px solid ${C.border}` }}>
            <SidebarContent onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* ── Main Area ── */}
      <div
        className="flex-1 flex flex-col min-w-0 transition-all duration-300"
        style={{ marginRight: desktopOpen ? "260px" : "0" }}
      >
        {/* ── Header ── */}
        <header className="sticky top-0 z-20 flex items-center gap-3 px-4 lg:px-6 py-3 border-b"
          style={{ background: C.card, borderColor: C.border }}>

          {/* همبرجر موبايل */}
          <button
            className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: C.bg }}
            onClick={() => setMobileOpen(true)}>
            <HamburgerIcon color={C.muted} />
          </button>

          {/* تبديل السيدبار ديسكتوب */}
          <button
            className="hidden lg:flex w-9 h-9 rounded-xl items-center justify-center flex-shrink-0"
            style={{ background: C.bg }}
            onClick={() => setDesktopOpen((v) => !v)}>
            <HamburgerIcon color={C.muted} />
          </button>

          {/* عنوان الصفحة */}
          <p className="flex-1 text-base font-black text-center" style={{ color: C.text }}>
            {title}
          </p>

          {/* أدمن + أفاتار */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold" style={{ color: C.text }}>أحمد الإداري</p>
              <p className="text-xs" style={{ color: C.muted }}>مدير النظام</p>
            </div>
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0"
              style={{ background: C.teal, color: "#fff" }}>
              أ
            </div>
          </div>
        </header>

        {/* ── Page Content ── */}
        <main className="flex-1 p-4 lg:p-6">
          {children}
        </main>
      </div>

    </div>
  );
}
