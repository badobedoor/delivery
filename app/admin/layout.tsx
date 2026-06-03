"use client";

import Link              from "next/link";
import { usePathname }   from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { supabase }      from "@/lib/supabase";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/* Pages staff role is allowed to visit */
const STAFF_ALLOWED = ["/admin/orders", "/admin/restaurants", "/admin/drivers"];

const C = {
  bg:     "#0F172A",
  card:   "#1E293B",
  teal:   "#14B8A6",
  text:   "#F1F5F9",
  muted:  "#94A3B8",
  border: "#334155",
  red:    "#EF4444",
};

const allNavLinks = [
  { emoji: "📊", label: "الرئيسية",   href: "/admin/dashboard"       },
  { emoji: "📦", label: "الطلبات",    href: "/admin/orders"          },
  { emoji: "🚚", label: "طلبات دليفري", href: "/admin/delivery-requests" },
  { emoji: "🗂️", label: "الأرشيف",    href: "/admin/archive"         },
  { emoji: "🍔", label: "المطاعم",    href: "/admin/restaurants"     },
  { emoji: "🗺️", label: "الأحياء",    href: "/admin/areas"           },
  { emoji: "🛵", label: "الدلفري",    href: "/admin/drivers"        },
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
  "/admin/orders":               "الطلبات",
  "/admin/delivery-requests":    "طلبات الدليفري",
  "/admin/archive":        "الأرشيف",
  "/admin/restaurants":    "المطاعم",
  "/admin/areas":          "الأحياء",
  "/admin/drivers":       "الدلفري",
  "/admin/shifts":         "الورديات",
  "/admin/coupons":        "الكوبونات",
  "/admin/accounts":       "الحسابات",
  "/admin/settings":       "الإعدادات",
  "/admin/users":          "المستخدمون",
  "/admin/advertisements": "الإعلانات",
  "/admin/sections":       "الأقسام",
  "/admin/team":           "الفريق",
};

function SortableNavItem({
  id,
  children,
}: {
  id: string;
  children: (handleProps: React.HTMLAttributes<HTMLElement>) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
    >
      {children({ ...attributes, ...listeners } as React.HTMLAttributes<HTMLElement>)}
    </div>
  );
}

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
  onReorder,
  newOrdersCount = 0,
}: {
  collapsed?: boolean;
  navLinks: typeof allNavLinks;
  onClose?: () => void;
  onLogout: () => void;
  onReorder?: (newLinks: typeof allNavLinks) => void;
  newOrdersCount?: number;
}) {
  const pathname = usePathname();
  const sensors  = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = navLinks.findIndex((l) => l.href === active.id);
    const newIndex = navLinks.findIndex((l) => l.href === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onReorder?.(arrayMove(navLinks, oldIndex, newIndex));
  }

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
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={navLinks.map((l) => l.href)} strategy={verticalListSortingStrategy}>
        {navLinks.map((link) => {
          const active      = pathname.startsWith(link.href);
          const hasNewBadge = newOrdersCount > 0 && link.href === "/admin/orders";
          return (
            <SortableNavItem key={link.href} id={link.href}>
            {(handleProps) => (
            <div className="flex items-center">
              {!collapsed && (
                <span
                  {...handleProps}
                  style={{ flexShrink: 0, cursor: "grab", touchAction: "none", display: "flex", padding: "0 4px" }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill={C.muted}>
                    <circle cx="9" cy="5" r="1.5"/><circle cx="15" cy="5" r="1.5"/>
                    <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
                    <circle cx="9" cy="19" r="1.5"/><circle cx="15" cy="19" r="1.5"/>
                  </svg>
                </span>
              )}
              <Link
                href={link.href}
                onClick={onClose}
                title={collapsed ? link.label : undefined}
                className="relative flex items-center rounded-xl text-sm font-semibold transition-all whitespace-nowrap overflow-hidden flex-1"
                style={{
                  gap:            collapsed ? 0          : "12px",
                  padding:        collapsed ? "10px 0"   : "10px 16px",
                  justifyContent: collapsed ? "center"   : "flex-start",
                  background:     active        ? C.teal
                                : hasNewBadge   ? `${C.red}18`
                                : "transparent",
                  color:          active        ? "#fff"
                                : hasNewBadge   ? C.red
                                : C.muted,
                  border:         hasNewBadge && !active
                                ? `1px solid ${C.red}44`
                                : "1px solid transparent",
                }}
              >
                {/* Emoji — with small dot badge in collapsed mode */}
                <div className="relative flex-shrink-0">
                  <span className="text-base">{link.emoji}</span>
                  {collapsed && hasNewBadge && (
                    <span
                      className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full animate-pulse"
                      style={{ background: C.red }}
                    />
                  )}
                </div>

                {/* Label + count badge in expanded mode */}
                {!collapsed && (
                  <div className="flex items-center justify-between flex-1 min-w-0">
                    <span>{link.label}</span>
                    {hasNewBadge && (
                      <span
                        className="mr-1 flex-shrink-0 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-black"
                        style={{ background: C.red, color: "#fff" }}
                      >
                        {newOrdersCount}
                      </span>
                    )}
                  </div>
                )}
              </Link>
            </div>
            )}
            </SortableNavItem>
          );
        })}
        </SortableContext>
        </DndContext>
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

type AuthUser = { id: string; name: string; role: string; type: string };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  /* ── All hooks declared before any conditional return ── */
  const [user,           setUser]           = useState<AuthUser | null>(null);
  const [checked,        setChecked]        = useState(false);
  const [collapsed,      setCollapsed]      = useState(false);
  const [mobileOpen,     setMobileOpen]     = useState(false);
  const [newOrdersCount, setNewOrdersCount] = useState(0);
  const [savedOrder,     setSavedOrder]     = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem("admin_nav_order");
      return saved ? (JSON.parse(saved) as string[]) : [];
    } catch { return []; }
  });

  const isLoginPage = pathname === "/admin/login";

  /* ── Fetch new orders count for sidebar badge ── */
  const fetchNewOrdersCount = useCallback(async () => {
    if (!user || isLoginPage) { setNewOrdersCount(0); return; }
    const { count } = await supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("status", "new");
    setNewOrdersCount(count ?? 0);
  }, [user, isLoginPage]);

  useEffect(() => { fetchNewOrdersCount(); }, [fetchNewOrdersCount]);
  useAutoRefresh(fetchNewOrdersCount);

  /* ── Realtime: تحديث العداد فور وصول طلب جديد أو تغيير حالة ── */
  useEffect(() => {
    if (!user || isLoginPage) return;
    const channel = supabase
      .channel("layout-orders-count")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, (payload) => {
        fetchNewOrdersCount();
        if ((payload.new as any)?.status !== "new") return;
        try {
          const src = localStorage.getItem("notification_sound") ?? "/sounds/new-order.mp3";
          new Audio(src).play().catch(() => {});
        } catch { /* ignore */ }
        if (Notification.permission === "granted") {
          new Notification("🔔 طلب جديد وصل!", { body: "يوجد طلب جديد يحتاج مراجعة", icon: "/icon.png" });
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, fetchNewOrdersCount)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, isLoginPage, fetchNewOrdersCount]);

  /* ── Fetch current user from secure cookie ── */
  useEffect(() => {
    if (isLoginPage) { setChecked(true); return; }

    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setUser(data.authenticated ? (data.user as AuthUser) : null))
      .catch(() => setUser(null))
      .finally(() => setChecked(true));
  }, [isLoginPage]);

  /* ── Staff role: restrict to allowed routes ── */
  useEffect(() => {
    if (isLoginPage || !checked || !user) return;
    if (user.role !== "staff") return;
    const allowed = STAFF_ALLOWED.some((p) => pathname.startsWith(p));
    if (!allowed) window.location.href = "/admin/orders";
  }, [isLoginPage, checked, user, pathname]);

  /* ── No session: redirect to login ── */
  useEffect(() => {
    if (isLoginPage || !checked) return;
    if (!user) window.location.href = "/admin/login";
  }, [isLoginPage, checked, user]);

  /* ── Login page: skip ALL auth checks, render immediately ── */
  if (isLoginPage) return <>{children}</>;

  /* ── Logout: clear auth cookie via API ── */
  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    window.location.href = user?.role === "staff" ? "/staff/login" : "/admin/login";
  }

  /* ── Wait until auth check completes ── */
  if (!checked) return <AuthLoadingScreen />;

  /* ── No session: show loading screen while redirect fires ── */
  if (!user) return <AuthLoadingScreen />;

  /* Pages only super_admin can see */
  const SUPER_ADMIN_ONLY = ["/admin/advertisements"];

  /* ── Nav links: staff → restricted, admin → no super_admin_only, super_admin → all ── */
  const navLinks = user.role === "staff"
    ? allNavLinks.filter((l) => STAFF_ALLOWED.includes(l.href))
    : user.role === "admin"
    ? allNavLinks.filter((l) => !SUPER_ADMIN_ONLY.includes(l.href))
    : allNavLinks;

  const orderedNavLinks = savedOrder.length > 0
    ? [
        ...savedOrder
          .filter((href) => navLinks.some((l) => l.href === href))
          .map((href) => navLinks.find((l) => l.href === href)!),
        ...navLinks.filter((l) => !savedOrder.includes(l.href)),
      ]
    : navLinks;

  function handleNavReorder(newLinks: typeof allNavLinks) {
    const hrefs = newLinks.map((l) => l.href);
    setSavedOrder(hrefs);
    try { localStorage.setItem("admin_nav_order", JSON.stringify(hrefs)); } catch {}
  }

  const title        = pageTitle[pathname] ?? "لوحة التحكم";
  const displayName  = user.name ?? "مدير";
  const displayRole  = user.role === "super_admin" ? "سوبر أدمن"
    : user.role === "admin"                        ? "مدير"
    : "موظف";
  const avatarLetter = displayName[0] ?? "م";
  const sidebarW     = collapsed ? 64 : 260;

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
          navLinks={orderedNavLinks}
          onLogout={handleLogout}
          onReorder={handleNavReorder}
          newOrdersCount={newOrdersCount}
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
              navLinks={orderedNavLinks}
              onClose={() => setMobileOpen(false)}
              onLogout={handleLogout}
              onReorder={handleNavReorder}
              newOrdersCount={newOrdersCount}
            />
          </div>
        </div>
      )}
    </div>
  );
}
