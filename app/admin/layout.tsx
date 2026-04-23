"use client";

import Link              from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect }    from "react";
import { useAuth }  from "@/hooks/useAuth";
import { signOut }  from "@/lib/auth";

/* Pages staff are allowed to visit */
const STAFF_ALLOWED = ["/admin/orders", "/admin/restaurants", "/admin/delivery"];

const C = {
  bg:     "#0F172A",
  card:   "#1E293B",
  teal:   "#14B8A6",
  text:   "#F1F5F9",
  muted:  "#94A3B8",
  border: "#334155",
};

const allNavLinks = [
  { emoji: "📊", label: "الرئيسية",   href: "/admin/dashboard"       },
  { emoji: "📦", label: "الطلبات",    href: "/admin/orders"          },
  { emoji: "🍔", label: "المطاعم",    href: "/admin/restaurants"     },
  { emoji: "🗺️", label: "الأحياء",    href: "/admin/areas"           },
  { emoji: "🛵", label: "الدلفري",    href: "/admin/delivery"        },
  { emoji: "🕐", label: "الورديات",   href: "/admin/shifts"          },
  { emoji: "🎟️", label: "الكوبونات",  href: "/admin/coupons"         },
  { emoji: "💰", label: "الحسابات",   href: "/admin/accounts"        },
  { emoji: "👥", label: "المستخدمين", href: "/admin/users"           },
  { emoji: "🖼️", label: "الإعلانات",  href: "/admin/advertisements"  },
  { emoji: "📱", label: "الأقسام",    href: "/admin/sections"        },
  { emoji: "👥", label: "الفريق",     href: "/admin/team"            },
  { emoji: "⚙️", label: "الإعدادات",  href: "/admin/settings"        },
];

const pageTitle: Record<string, string> = {
  "/admin/dashboard":      "الرئيسية",
  "/admin/orders":         "الطلبات",
  "/admin/restaurants":    "المطاعم",
  "/admin/areas":          "الأحياء",
  "/admin/delivery":       "الدلفري",
  "/admin/shifts":         "الورديات",
  "/admin/coupons":        "الكوبونات",
  "/admin/accounts":       "الحسابات",
  "/admin/settings":       "الإعدادات",
  "/admin/users":          "المستخدمون",
  "/admin/advertisements": "الإعلانات",
  "/admin/sections":       "الأقسام",
  "/admin/team":           "الفريق",
};

function HamburgerIcon({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round">
      <path d="M3 12h18M3 6h18M3 18h18" />
    </svg>
  );
}

function SidebarContent({
  collapsed = false,
  navLinks,
  onClose,
  onLogout,
}: {
  collapsed?: boolean;
  navLinks: typeof allNavLinks;
  onClose?: () => void;
  onLogout: () => void;
}) {
  const pathname = usePathname();

  return (
    <aside
      className="flex flex-col h-full overflow-hidden transition-all duration-300"
      style={{ width: collapsed ? "64px" : "260px", background: C.card }}
    >
      {/* ── Logo ── */}
      <div
        className="flex items-center gap-3 border-b overflow-hidden"
        style={{
          padding:        collapsed ? "24px 0"    : "24px 24px",
          justifyContent: collapsed ? "center"    : "flex-start",
          borderColor:    C.border,
        }}
      >
        <span className="text-xl flex-shrink-0" style={{ color: C.teal }}>⚡</span>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-xl font-black whitespace-nowrap" style={{ color: C.teal }}>حالا</p>
            <p className="text-xs mt-0.5 whitespace-nowrap"     style={{ color: C.muted }}>لوحة التحكم</p>
          </div>
        )}
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 py-4 overflow-y-auto flex flex-col gap-1"
        style={{ padding: collapsed ? "16px 8px" : "16px 12px" }}>
        {navLinks.map((link) => {
          const active = pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onClose}
              title={collapsed ? link.label : undefined}
              className="flex items-center rounded-xl text-sm font-semibold transition-colors whitespace-nowrap overflow-hidden"
              style={{
                gap:            collapsed ? 0          : "12px",
                padding:        collapsed ? "10px 0"   : "10px 16px",
                justifyContent: collapsed ? "center"   : "flex-start",
                background:     active    ? C.teal     : "transparent",
                color:          active    ? "#fff"     : C.muted,
              }}
            >
              <span className="text-base flex-shrink-0">{link.emoji}</span>
              {!collapsed && link.label}
            </Link>
          );
        })}
      </nav>

      {/* ── Logout ── */}
      <div className="border-t" style={{ padding: collapsed ? "16px 8px" : "16px 12px", borderColor: C.border }}>
        <button
          onClick={onLogout}
          className="flex items-center rounded-xl text-sm font-semibold w-full hover:bg-red-500/10 transition-colors whitespace-nowrap overflow-hidden"
          style={{
            gap:            collapsed ? 0        : "12px",
            padding:        collapsed ? "10px 0" : "10px 16px",
            justifyContent: collapsed ? "center" : "flex-start",
            color: "#EF4444",
          }}
        >
          <span className="flex-shrink-0">🚪</span>
          {!collapsed && "تسجيل الخروج"}
        </button>
      </div>
    </aside>
  );
}

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

/* ── Staff session type (from localStorage) ── */
type StaffUser = { id: number; name: string; phone: string; [key: string]: unknown };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();

  /* ── Login page: skip ALL auth checks, render immediately ── */
  if (pathname === "/admin/login") return <>{children}</>;

  /* ── localStorage staff session (checked before Supabase auth) ── */
  const [staffUser,    setStaffUser]    = useState<StaffUser | null>(null);
  const [staffChecked, setStaffChecked] = useState(false);

  useEffect(() => {
    /* If a driver session exists, they should not be here */
    try {
      const driverRaw = localStorage.getItem("driver_user");
      if (driverRaw && JSON.parse(driverRaw)) {
        window.location.href = "/driver/orders";
        return;
      }
    } catch { /* ignore */ }

    try {
      const raw = localStorage.getItem("staff_user");
      setStaffUser(raw ? (JSON.parse(raw) as StaffUser) : null);
    } catch {
      setStaffUser(null);
    }
    setStaffChecked(true);
  }, []);

  /* ── Supabase auth (admin users only) ── */
  const { user, profile, loading: authLoading } = useAuth();

  const [collapsed,  setCollapsed]  = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const title = pageTitle[pathname] ?? "لوحة التحكم";

  /* ── Staff route guard ── */
  useEffect(() => {
    if (!staffChecked || !staffUser) return;

    const allowed = STAFF_ALLOWED.some((p) => pathname.startsWith(p));
    if (!allowed) {
      window.location.href = "/admin/orders";
    }
  }, [staffChecked, staffUser, pathname]);

  /* ── Admin/Supabase auth guard (only when no staff session) ── */
  useEffect(() => {
    if (!staffChecked || staffUser) return;   /* skip if staff session exists */
    if (authLoading) return;

    if (!user) {
      router.replace("/admin/login");
      return;
    }
    if (profile?.role === "driver") { router.replace("/driver/orders");    return; }
    if (profile?.role === "customer") { router.replace("/");               return; }
    if (profile?.role === "staff") {
      const allowed = STAFF_ALLOWED.some((p) => pathname.startsWith(p));
      if (!allowed) router.replace("/admin/orders");
    }
  }, [staffChecked, staffUser, authLoading, user, profile, pathname, router]);

  /* ── Logout ── */
  async function handleLogout() {
    if (staffUser) {
      localStorage.removeItem("staff_user");
      document.cookie = "staff_session=; path=/; max-age=0";
      window.location.href = "/staff/login";
      return;
    }
    await signOut();
    router.replace("/admin/login");
  }

  /* ── Wait until localStorage is read ── */
  if (!staffChecked) return <AuthLoadingScreen />;

  /* ── Staff mode: render immediately, no Supabase session needed ── */
  const isStaffMode = Boolean(staffUser);

  /* ── Admin mode: wait for Supabase auth ── */
  if (!isStaffMode && (authLoading || !user)) return <AuthLoadingScreen />;

  /* ── Nav links: staff sees filtered list, admin sees all ── */
  const navLinks = isStaffMode
    ? allNavLinks.filter((l) => STAFF_ALLOWED.includes(l.href))
    : profile?.role === "staff"
      ? allNavLinks.filter((l) => STAFF_ALLOWED.includes(l.href))
      : allNavLinks;

  /* ── Header display info ── */
  const displayName  = isStaffMode
    ? (staffUser?.name ?? "موظف")
    : (profile?.name ?? user?.email ?? "مدير");
  const displayRole  = isStaffMode ? "موظف" : (profile?.role === "admin" ? "مدير النظام" : profile?.role ?? "");
  const avatarLetter = displayName[0] ?? "م";

  const sidebarW = collapsed ? 64 : 260;

  return (
    <div
      className="min-h-screen flex"
      style={{ background: C.bg, color: C.text, fontFamily: "var(--font-cairo), Arial, sans-serif" }}
    >
      {/* ── Desktop Sidebar Spacer ── */}
      <div className="hidden lg:block flex-shrink-0 transition-all duration-300"
        style={{ width: `${sidebarW}px` }} />

      {/* ── Desktop Sidebar (fixed right) ── */}
      <div className="hidden lg:block fixed top-0 bottom-0 right-0 z-30 transition-all duration-300"
        style={{ width: `${sidebarW}px`, borderLeft: `1px solid ${C.border}` }}>
        <SidebarContent
          collapsed={collapsed}
          navLinks={navLinks}
          onLogout={handleLogout}
        />
      </div>

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* ── Header ── */}
        <header className="sticky top-0 z-20 flex items-center gap-3 px-4 lg:px-6 py-3 border-b"
          style={{ background: C.card, borderColor: C.border }}>

          <button className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: C.bg }} onClick={() => setMobileOpen(true)}>
            <HamburgerIcon color={C.muted} />
          </button>

          <button className="hidden lg:flex w-9 h-9 rounded-xl items-center justify-center flex-shrink-0"
            style={{ background: C.bg }} onClick={() => setCollapsed((v) => !v)}>
            <HamburgerIcon color={C.muted} />
          </button>

          <p className="flex-1 text-base font-black text-center" style={{ color: C.text }}>
            {title}
          </p>

          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold" style={{ color: C.text }}>{displayName}</p>
              <p className="text-xs"               style={{ color: C.muted }}>{displayRole}</p>
            </div>
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0"
              style={{ background: C.teal, color: "#fff" }}>
              {avatarLetter}
            </div>
          </div>
        </header>

        {/* ── Page content ── */}
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>

      {/* ── Mobile drawer ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex justify-end">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <div className="relative z-50 h-full" style={{ borderLeft: `1px solid ${C.border}` }}>
            <SidebarContent
              navLinks={navLinks}
              onClose={() => setMobileOpen(false)}
              onLogout={handleLogout}
            />
          </div>
        </div>
      )}
    </div>
  );
}
