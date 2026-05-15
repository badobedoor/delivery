"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function BottomNav() {
  const pathname = usePathname();

  const showBottomNav =
    pathname === "/" ||
    pathname === "/restaurants" ||
    pathname === "/favorites" ||
    pathname.startsWith("/search") ||
    pathname === "/account" ||
    pathname === "/orders" ||
    pathname === "/offers" ||
    pathname === "/coupons" ||
    pathname === "/notifications" ||
    pathname === "/address" ||
    pathname === "/help" ||
    pathname === "/about";

  const showSearch = pathname.startsWith("/restaurants") || pathname.startsWith("/restaurant");
  const isHome     = pathname === "/";
  const isFav      = pathname.startsWith("/favorites");
  const isAccount  = pathname.startsWith("/account");

  if (!showBottomNav) return null;

  const active = "var(--color-primary)";
  const muted  = "var(--color-muted)";

  return (
    <nav className="fixed bottom-0 right-0 left-0 bg-white border-t border-[var(--color-border)] flex items-center justify-around py-2 z-20">

      {/* الرئيسية */}
      <Link href="/" className="flex flex-col items-center gap-0.5 px-3">
        <svg width="22" height="22" viewBox="0 0 24 24"
          fill={isHome ? active : "none"}
          stroke={isHome ? "none" : muted}
          strokeWidth="1.8">
          <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
          <path d="M9 21V12h6v9" />
        </svg>
        <span className="text-[10px]"
          style={{ fontWeight: isHome ? 600 : 500, color: isHome ? active : muted }}>
          الرئيسية
        </span>
      </Link>

      {/* البحث — يظهر فقط في صفحات /restaurants و/restaurant/* */}
      {showSearch && (
        <Link href="/search" className="flex flex-col items-center gap-0.5 px-3">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={muted} strokeWidth="1.8">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <span className="text-[10px] font-medium" style={{ color: muted }}>بحث</span>
        </Link>
      )}

      {/* المفضلة */}
      <Link href="/favorites" className="flex flex-col items-center gap-0.5 px-3">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
          stroke={isFav ? active : muted}
          strokeWidth="1.8" strokeLinecap="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
        <span className="text-[10px]"
          style={{ fontWeight: isFav ? 600 : 500, color: isFav ? active : muted }}>
          المفضلة
        </span>
      </Link>

      {/* حسابي */}
      <Link href="/account" className="flex flex-col items-center gap-0.5 px-3">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
          stroke={isAccount ? active : muted}
          strokeWidth="1.8">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        <span className="text-[10px]"
          style={{ fontWeight: isAccount ? 600 : 500, color: isAccount ? active : muted }}>
          حسابي
        </span>
      </Link>

    </nav>
  );
}
