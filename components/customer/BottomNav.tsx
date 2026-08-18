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

  const isHome    = pathname === "/";
  const isOrders  = pathname.startsWith("/orders");
  const isOffers  = pathname.startsWith("/offers");
  const isFav     = pathname.startsWith("/favorites");
  const isAccount = pathname.startsWith("/account");

  if (!showBottomNav) return null;

  const active = "var(--color-primary)";
  const muted  = "var(--color-muted)";

  return (
    <nav className="fixed bottom-0 right-0 left-0 bg-white border-t border-[var(--color-border)] flex items-center justify-around py-2 z-20">

      {/* الرئيسية */}
      <Link href="/" className="flex flex-col items-center gap-0.5 px-3">
        <svg width="22" height="22" viewBox="0 0 24 24" fill={isHome ? active : muted}>
          <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
        </svg>
        <span className="text-[10px]"
          style={{ fontWeight: isHome ? 600 : 500, color: isHome ? active : muted }}>
          الرئيسية
        </span>
      </Link>

      {/* طلباتي */}
      <Link href="/orders" className="flex flex-col items-center gap-0.5 px-3">
        <svg width="22" height="22" viewBox="0 0 24 24" fill={isOrders ? active : muted}>
          <path fillRule="evenodd"
            d="M4 2h16v20l-1.5-1.5L16 22l-1.5-1.5L13 22l-1.5-1.5L10 22l-1.5-1.5L7 22l-1.5-1.5L4 22V2zM7 6h10v2H7zM7 10h10v2H7zM7 14h6v2H7z" />
        </svg>
        <span className="text-[10px]"
          style={{ fontWeight: isOrders ? 600 : 500, color: isOrders ? active : muted }}>
          طلباتي
        </span>
      </Link>

      {/* العروض */}
      <Link href="/offers" className="flex flex-col items-center gap-0.5 px-3">
        <svg width="22" height="22" viewBox="0 0 24 24" fill={isOffers ? active : muted}>
          <path fillRule="evenodd"
            d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM10.4 8.5a1.9 1.9 0 1 0-3.8 0 1.9 1.9 0 1 0 3.8 0zM17.4 15.5a1.9 1.9 0 1 0-3.8 0 1.9 1.9 0 1 0 3.8 0zM15.7 7.9L14.3 7.1L8.3 16.1L9.7 16.9Z" />
        </svg>
        <span className="text-[10px]"
          style={{ fontWeight: isOffers ? 600 : 500, color: isOffers ? active : muted }}>
          العروض
        </span>
      </Link>

      {/* المفضلة */}
      <Link href="/favorites" className="flex flex-col items-center gap-0.5 px-3">
        <svg width="22" height="22" viewBox="0 0 24 24" fill={isFav ? active : muted}>
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
        <span className="text-[10px]"
          style={{ fontWeight: isFav ? 600 : 500, color: isFav ? active : muted }}>
          المفضلة
        </span>
      </Link>

      {/* حسابي */}
      <Link href="/account" className="flex flex-col items-center gap-0.5 px-3">
        <svg width="22" height="22" viewBox="0 0 24 24" fill={isAccount ? active : muted}>
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
        </svg>
        <span className="text-[10px]"
          style={{ fontWeight: isAccount ? 600 : 500, color: isAccount ? active : muted }}>
          حسابي
        </span>
      </Link>

    </nav>
  );
}
